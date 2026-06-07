import { NextResponse } from "next/server";
import { BookingStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import {
  buildNotification,
  buildReservationWriteData,
  createAuditEntry,
  getManagerApprovalDefaults,
  isLegacyReservationSchemaError,
  sendManagerApprovalRequestEmail,
  serializeReservation,
  validateReservationBusinessRules
} from "@/lib/reservations";
import { reservationSchema } from "@/lib/validation";
import { ReservationInput } from "@/lib/types";
export const dynamic = 'force-dynamic';

function buildReservationWhere(
  params: {
    start: string | null;
    end: string | null;
    roomId: string | null;
    requesterEmail: string | null;
    status: string | null;
    search: string | null;
    typeFilter: string | null;
    chargedCompany: string | null;
    roomName: string | null;
    roomType: string | null;
    foodService: string | null;
  },
  legacy: boolean
): object {
  const {
    start,
    end,
    roomId,
    requesterEmail,
    status,
    search,
    typeFilter,
    chargedCompany,
    roomName,
    roomType,
    foodService
  } = params;

  const orConditions: object[] = [];

  if (typeFilter) {
    orConditions.push({
      OR: legacy
        ? [{ eventType: typeFilter }]
        : [{ reservationType: typeFilter }, { eventType: typeFilter }]
    });
  }

  if (search) {
    orConditions.push({
      OR: legacy
        ? [{ bookingCompany: { contains: search } }, { meetingName: { contains: search } }]
        : [
            { guestCompany: { contains: search } },
            { chargedCompany: { contains: search } },
            { chargedDepartment: { contains: search } }
          ]
    });
  }

  const textFilter =
    orConditions.length === 0
      ? {}
      : orConditions.length === 1
        ? orConditions[0]
        : { AND: orConditions };

  return {
    ...(start || end
      ? legacy
        ? {
            reservationDate: {
              ...(start ? { gte: new Date(start) } : {}),
              ...(end ? { lte: new Date(end) } : {})
            }
          }
        : {
            AND: [
              ...(end ? [{ reservationDate: { lte: new Date(end) } }] : []),
              ...(start ? [{ reservationEndDate: { gte: new Date(start) } }] : [])
            ]
          }
      : {}),
    ...(roomId ? { roomId } : {}),
    ...(requesterEmail ? { requesterEmail } : {}),
    ...(status ? { bookingStatus: status as BookingStatus } : {}),
    ...(!legacy && chargedCompany ? { chargedCompany } : {}),
    ...(foodService !== null ? { foodServiceRequired: foodService === "true" } : {}),
    ...((roomName || roomType)
      ? {
          room: {
            ...(roomName ? { name: roomName } : {}),
            ...(roomType ? { type: roomType } : {})
          }
        }
      : {}),
    ...textFilter
  };
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const roomId = searchParams.get("roomId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const requestedRequesterEmail = searchParams.get("requesterEmail");
  const requesterEmail =
    auth.user.role === "ADMIN" ? requestedRequesterEmail : auth.user.email;

  // Drill-down filter params
  const typeFilter = searchParams.get("typeFilter");
  const chargedCompany = searchParams.get("chargedCompany");
  const roomName = searchParams.get("roomName");
  const roomType = searchParams.get("roomType");
  const foodService = searchParams.get("foodService");
  const weekdayParam = searchParams.get("weekday");

  const filterParams = {
    start,
    end,
    roomId,
    requesterEmail,
    status,
    search,
    typeFilter,
    chargedCompany,
    roomName,
    roomType,
    foodService
  };

  let reservations;

  try {
    reservations = await prisma.reservation.findMany({
      where: buildReservationWhere(filterParams, false),
      include: {
        room: true,
        auditEntries: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    reservations = await prisma.reservation.findMany({
      where: buildReservationWhere(filterParams, true),
      include: {
        room: true,
        auditEntries: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  }

  // Weekday filter (applied in JS since Prisma has no day-of-week filter)
  if (weekdayParam) {
    const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayParam);
    if (weekdayIndex >= 0) {
      reservations = reservations.filter(
        (r) => new Date(r.reservationDate).getDay() === weekdayIndex
      );
    }
  }

  return NextResponse.json(reservations.map(serializeReservation));
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = reservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reservationInput = {
    ...(parsed.data as ReservationInput),
    createdByRole: auth.user.role,
    requesterEmail: auth.user.role === UserRole.ADMIN ? parsed.data.requesterEmail : auth.user.email,
    requesterName: auth.user.role === UserRole.ADMIN ? parsed.data.requesterName : auth.user.name,
    bookingStatus: auth.user.role === UserRole.ADMIN ? BookingStatus.CONFIRMED : BookingStatus.PENDING
  } satisfies ReservationInput;

  const validation = await validateReservationBusinessRules(reservationInput);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.error,
        conflicts: validation.conflicts?.map(serializeReservation),
        notification: buildNotification("conflict", validation.error)
      },
      { status: 409 }
    );
  }

  const count = await prisma.reservation.count();
  let reservation;

  try {
    reservation = await prisma.reservation.create({
      data: {
        reservationCode: `RSV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
        ...buildReservationWriteData(reservationInput),
        ...getManagerApprovalDefaults({
          createdByRole: reservationInput.createdByRole,
          managerId: validation.manager?.id
        })
      },
      include: {
        room: true,
        auditEntries: true
      }
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    reservation = await prisma.reservation.create({
      data: {
        reservationCode: `RSV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
        ...buildReservationWriteData(reservationInput, { legacy: true })
      },
      include: {
        room: true,
        auditEntries: true
      }
    });
  }

  await createAuditEntry({
    reservationId: reservation.id,
    action: "CREATED",
    actorName: auth.user.name,
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    notes: reservationInput.remarks,
    snapshot: reservation
  });

  const fresh = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservation.id },
    include: { room: true, auditEntries: { orderBy: { createdAt: "desc" } } }
  });

  const serializedFresh = serializeReservation(fresh);

  if (reservationInput.createdByRole === "STANDARD" && validation.manager) {
    await createAuditEntry({
      reservationId: reservation.id,
      action: "MANAGER_APPROVAL_REQUESTED",
      actorName: reservationInput.requesterName,
      actorEmail: reservationInput.requesterEmail,
      actorRole: reservationInput.createdByRole,
      notes: `Submitted to manager ${validation.manager.name} for approval.`,
      snapshot: reservation
    });

    try {
      await sendManagerApprovalRequestEmail({
        reservation: serializedFresh,
        manager: validation.manager
      });
    } catch {
      // Do not fail reservation creation if email delivery is unavailable.
    }
  }

  return NextResponse.json(
    {
      reservation: serializedFresh,
      notification: buildNotification("created", `${serializedFresh.guestCompany} in ${fresh.room.name}`)
    },
    { status: 201 }
  );
}
