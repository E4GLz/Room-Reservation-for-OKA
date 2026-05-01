import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole, requireApiUser } from "@/lib/server-auth";
import {
  buildNotification,
  buildReservationWriteData,
  createAuditEntry,
  isLegacyReservationSchemaError,
  serializeReservation,
  validateReservationBusinessRules
} from "@/lib/reservations";
import { reservationSchema } from "@/lib/validation";
import { ReservationInput } from "@/lib/types";
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      room: true,
      auditEntries: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const canView =
    auth.user.role === "ADMIN" ||
    reservation.requesterEmail === auth.user.email ||
    reservation.managerId === auth.user.id;

  if (!canView) {
    return NextResponse.json({ error: "You do not have access to this reservation." }, { status: 403 });
  }

  return NextResponse.json(serializeReservation(reservation));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = reservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!existing) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (
    existing.createdByRole === "STANDARD" &&
    existing.bookingStatus === BookingStatus.PENDING &&
    "managerApprovalStatus" in existing &&
    existing.managerApprovalStatus === "PENDING" &&
    parsed.data.bookingStatus === BookingStatus.CONFIRMED
  ) {
    return NextResponse.json(
      { error: "This request still requires manager approval before admin confirmation." },
      { status: 400 }
    );
  }
  
  const reservationInput = {
    ...(parsed.data as ReservationInput),
    createdByRole: existing.createdByRole
  } satisfies ReservationInput;

  const validation = await validateReservationBusinessRules(reservationInput, id);
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

  let reservation;
  const roomChanged = existing.roomId !== reservationInput.roomId;
  const roomChangeNotes = roomChanged
    ? `Room reassigned by admin from ${existing.roomId} to ${reservationInput.roomId}.`
    : undefined;

  try {
    reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...buildReservationWriteData(reservationInput)
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

    reservation = await prisma.reservation.update({
      where: { id },
      data: {
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
    action: reservationInput.bookingStatus === BookingStatus.CANCELLED ? "CANCELLED" : roomChanged ? "ROOM_REASSIGNED" : "UPDATED",
    actorName: auth.user.name,
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    notes: roomChangeNotes || reservationInput.cancellationNotes || reservationInput.remarks,
    snapshot: reservation
  });

  const fresh = await prisma.reservation.findUniqueOrThrow({
    where: { id },
    include: { room: true, auditEntries: { orderBy: { createdAt: "desc" } } }
  });

  const serializedFresh = serializeReservation(fresh);

  return NextResponse.json({
    reservation: serializedFresh,
    notification: buildNotification(
      reservationInput.bookingStatus === BookingStatus.CANCELLED ? "cancelled" : "updated",
      `${serializedFresh.guestCompany} in ${fresh.room.name}`
    )
  });
}
