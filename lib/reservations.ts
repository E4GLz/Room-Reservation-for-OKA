import { BookingStatus, UserRole, type Prisma, type Reservation, type ReservationAudit, type Room } from "@prisma/client";
import { eachDayOfInterval, parseISO } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { dateRangesOverlap, describeNotification, hasTimeConflict, toDateKey } from "@/lib/utils";
import type { NotificationEvent, ReservationInput } from "@/lib/types";

type ReservationForSerialization = Reservation & {
  room: Room;
  auditEntries?: ReservationAudit[];
};

function getReservationEndDateCompat(reservation: ReservationForSerialization & Record<string, unknown>) {
  return reservation.reservationEndDate instanceof Date ? reservation.reservationEndDate : reservation.reservationDate;
}

export function isLegacyReservationSchemaError(error: unknown) {
  return error instanceof Error && error.message.includes("reservationEndDate");
}

function normalizeDateOnly(value: string) {
  const date = parseISO(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildStoredRemarks(input: ReservationInput, options?: { legacy?: boolean }) {
  const preservedDetails = [
    input.foodServiceLocation ? `Food service location: ${input.foodServiceLocation}` : null,
    options?.legacy && input.reservationEndDate !== input.reservationDate ? `Date to: ${input.reservationEndDate}` : null,
    options?.legacy && input.guestName ? `Guest name: ${input.guestName}` : null,
    options?.legacy && input.guestCompanyLogo ? `Guest company logo: ${input.guestCompanyLogo}` : null,
    options?.legacy && input.chargedCompany ? `Charged company: ${input.chargedCompany}` : null,
    options?.legacy && input.materialsToDisplay ? `Materials: ${input.materialsToDisplay}` : null,
    input.foodServiceRequired ? "Food service: Yes" : null
  ].filter(Boolean);

  return [input.remarks?.trim(), preservedDetails.length > 0 ? `System detail backup:\n${preservedDetails.join("\n")}` : null]
    .filter(Boolean)
    .join("\n\n");
}

function stripSystemDetailsFromRemarks(remarks: string | null | undefined) {
  if (!remarks) {
    return null;
  }

  return remarks
    .replace(/\n\nSystem detail backup:\n[\s\S]*$/i, "")
    .replace(/\n\nLegacy detail backup:\n[\s\S]*$/i, "")
    .trim() || null;
}

function buildLegacyRemarks(input: ReservationInput) {
  const preservedDetails = [
    input.reservationEndDate !== input.reservationDate ? `Date to: ${input.reservationEndDate}` : null,
    input.guestName ? `Guest name: ${input.guestName}` : null,
    input.guestCompanyLogo ? `Guest company logo: ${input.guestCompanyLogo}` : null,
    input.chargedCompany ? `Charged company: ${input.chargedCompany}` : null,
    input.materialsToDisplay ? `Materials: ${input.materialsToDisplay}` : null,
    input.foodServiceRequired ? "Food service: Yes" : null,
    input.foodServiceLocation ? `Food service location: ${input.foodServiceLocation}` : null
  ].filter(Boolean);

  return [input.remarks?.trim(), preservedDetails.length > 0 ? `Legacy detail backup:\n${preservedDetails.join("\n")}` : null]
    .filter(Boolean)
    .join("\n\n");
}

export async function findConflictingReservations(input: {
  roomId: string;
  reservationDate: string;
  reservationEndDate: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}) {
  const reservationDate = normalizeDateOnly(input.reservationDate);
  const reservationEndDate = normalizeDateOnly(input.reservationEndDate);
  let reservations: Array<ReservationForSerialization & Record<string, unknown>>;

  try {
    reservations = await prisma.reservation.findMany({
      where: {
        roomId: input.roomId,
        reservationDate: {
          lte: reservationEndDate
        },
        reservationEndDate: {
          gte: reservationDate
        },
        bookingStatus: BookingStatus.CONFIRMED,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {})
      },
      include: {
        room: true
      }
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    reservations = await prisma.reservation.findMany({
      where: {
        roomId: input.roomId,
        reservationDate: {
          gte: reservationDate,
          lte: reservationEndDate
        },
        bookingStatus: BookingStatus.CONFIRMED,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {})
      },
      include: {
        room: true
      }
    });
  }

  return reservations.filter(
    (reservation) =>
      dateRangesOverlap(
        input.reservationDate,
        input.reservationEndDate,
        reservation.reservationDate,
        getReservationEndDateCompat(reservation)
      ) &&
      hasTimeConflict(input.startTime, input.endTime, reservation.startTime, reservation.endTime)
  );
}

export async function validateReservationBusinessRules(
  input: ReservationInput,
  excludeId?: string
) {
  const room = await prisma.room.findUnique({
    where: { id: input.roomId }
  });

  if (!room) {
    return {
      ok: false as const,
      error: "Selected room was not found."
    };
  }

  if (room.status !== "ACTIVE") {
    return {
      ok: false as const,
      error: "Selected room is inactive and cannot receive new bookings."
    };
  }

  if (input.attendeesCount > room.capacity && !input.overrideCapacity) {
    return {
      ok: false as const,
      error: `Attendee count exceeds room capacity of ${room.capacity}.`
    };
  }

  if (room.type !== input.reservationType) {
    return {
      ok: false as const,
      error: `Selected room is a ${room.type} room and cannot be used for ${input.reservationType} reservations.`
    };
  }

  const settings = await getAppSettings();
  const blockedDates = new Map(
    settings.blockedDays.map((blockedDay) => [toDateKey(blockedDay.date), blockedDay.label])
  );
  const reservationDays = eachDayOfInterval({
    start: normalizeDateOnly(input.reservationDate),
    end: normalizeDateOnly(input.reservationEndDate)
  });
  const blockedMatch = reservationDays.find((date) => blockedDates.has(toDateKey(date)));

  if (blockedMatch) {
    const dateKey = toDateKey(blockedMatch);
    return {
      ok: false as const,
      error: `Selected date is blocked for booking${blockedDates.get(dateKey) ? `: ${blockedDates.get(dateKey)}` : "."}`
    };
  }

  const conflicts = await findConflictingReservations({
    roomId: input.roomId,
    reservationDate: input.reservationDate,
    reservationEndDate: input.reservationEndDate,
    startTime: input.startTime,
    endTime: input.endTime,
    excludeId
  });

  if (conflicts.length > 0) {
    return {
      ok: false as const,
      error: "Room is already booked for the selected time.",
      conflicts
    };
  }

  return {
    ok: true as const,
    room
  };
}

export function getEffectiveBookingStatus(input: Pick<ReservationInput, "bookingStatus" | "createdByRole">) {
  if (input.bookingStatus === BookingStatus.CANCELLED) {
    return BookingStatus.CANCELLED;
  }

  return input.createdByRole === UserRole.ADMIN ? BookingStatus.CONFIRMED : input.bookingStatus;
}

export function buildReservationWriteData(input: ReservationInput, options?: { legacy?: boolean }) {
  const bookingStatus = getEffectiveBookingStatus(input);
  const remarks = options?.legacy ? buildLegacyRemarks(input) : buildStoredRemarks(input);

  if (options?.legacy) {
    return {
      roomId: input.roomId,
      reservationDate: normalizeDateOnly(input.reservationDate),
      reservationEndDate: normalizeDateOnly(input.reservationDate),
      reservationType: input.reservationType ?? null,
      guestCompany: input.guestCompany ?? null,
      guestName: input.guestName ?? null,
      guestCompanyLogo: input.guestCompanyLogo ?? null,
      chargedCompany: input.chargedCompany ?? null,
      chargedDepartment: input.chargedDepartment ?? null,
      materialsToDisplay: input.materialsToDisplay ?? null,
      foodServiceRequired: input.foodServiceRequired,
      foodServiceLocation: input.foodServiceLocation ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      bookingCompany: input.guestCompany,
      meetingName: input.chargedDepartment,
      eventType: input.reservationType,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      contactNumber: input.contactNumber || null,
      attendeesCount: input.attendeesCount,
      remarks: remarks || null,
      bookingStatus,
      createdByRole: input.createdByRole,
      overrideCapacity: input.overrideCapacity ?? false,
      cancellationNotes: input.cancellationNotes || null,
      cancelledAt: bookingStatus === BookingStatus.CANCELLED ? new Date() : null
    };
  }

  return {
    roomId: input.roomId,
    reservationDate: normalizeDateOnly(input.reservationDate),
    reservationEndDate: normalizeDateOnly(input.reservationEndDate),
    startTime: input.startTime,
    endTime: input.endTime,
    reservationType: input.reservationType,
    guestCompany: input.guestCompany,
    guestName: input.guestName || null,
    guestCompanyLogo: input.guestCompanyLogo || null,
    chargedCompany: input.chargedCompany,
    chargedDepartment: input.chargedDepartment,
    materialsToDisplay: input.materialsToDisplay || null,
    foodServiceRequired: input.foodServiceRequired,
    bookingCompany: input.guestCompany,
    meetingName: input.chargedDepartment,
    eventType: input.reservationType,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    contactNumber: input.contactNumber || null,
    attendeesCount: input.attendeesCount,
    remarks,
    bookingStatus,
    createdByRole: input.createdByRole,
    overrideCapacity: input.overrideCapacity ?? false,
    cancellationNotes: input.cancellationNotes || null,
    cancelledAt: bookingStatus === BookingStatus.CANCELLED ? new Date() : null
  };
}

export async function createAuditEntry(params: {
  reservationId: string;
  action: string;
  actorName: string;
  actorEmail: string;
  actorRole: "ADMIN" | "STANDARD";
  notes?: string;
  snapshot?: Prisma.InputJsonValue;
}) {
  return prisma.reservationAudit.create({
    data: {
      reservationId: params.reservationId,
      action: params.action,
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      notes: params.notes,
      snapshot: params.snapshot ? JSON.stringify(params.snapshot) : null
    }
  });
}

export function buildNotification(type: NotificationEvent["type"], detail: string): NotificationEvent {
  return {
    type,
    message: describeNotification(type, detail),
    timestamp: new Date().toISOString()
  };
}

function extractLegacyFoodServiceLocation(remarks: string | null | undefined) {
  if (!remarks) {
    return null;
  }

  const match = remarks.match(/Food service location:\s*(.+)/i);
  return match?.[1]?.trim() || null;
}

export function serializeReservation(reservation: ReservationForSerialization) {
  const record = reservation as ReservationForSerialization & Record<string, unknown>;

  return {
    ...record,
    reservationDate: reservation.reservationDate.toISOString(),
    reservationEndDate: getReservationEndDateCompat(record).toISOString(),
    reservationType: (record.reservationType as string | undefined) ?? reservation.eventType ?? "Meeting",
    guestCompany: (record.guestCompany as string | undefined) ?? reservation.bookingCompany,
    guestName: (record.guestName as string | null | undefined) ?? null,
    guestCompanyLogo: (record.guestCompanyLogo as string | null | undefined) ?? null,
    chargedCompany: (record.chargedCompany as string | undefined) ?? reservation.bookingCompany,
    chargedDepartment: (record.chargedDepartment as string | undefined) ?? reservation.meetingName,
    materialsToDisplay: (record.materialsToDisplay as string | null | undefined) ?? null,
    foodServiceRequired: (record.foodServiceRequired as boolean | undefined) ?? false,
    foodServiceLocation:
      (record.foodServiceLocation as string | null | undefined) ??
      extractLegacyFoodServiceLocation(reservation.remarks),
    remarks: stripSystemDetailsFromRemarks(reservation.remarks),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    room: {
      ...reservation.room,
      createdAt:
        reservation.room.createdAt instanceof Date
          ? reservation.room.createdAt.toISOString()
          : reservation.room.createdAt,
      updatedAt:
      reservation.room.updatedAt instanceof Date
          ? reservation.room.updatedAt.toISOString()
          : reservation.room.updatedAt
    },
    auditEntries:
      reservation.auditEntries?.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString()
      })) ?? []
  };
}
