import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildNotification,
  buildReservationWriteData,
  createAuditEntry,
  isLegacyReservationSchemaError,
  serializeReservation,
  validateReservationBusinessRules
} from "@/lib/reservations";
import { reservationSchema } from "@/lib/validation";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

  return NextResponse.json(serializeReservation(reservation));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const validation = await validateReservationBusinessRules(parsed.data, id);
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

  try {
    reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...buildReservationWriteData(parsed.data)
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
        ...buildReservationWriteData(parsed.data, { legacy: true })
      },
      include: {
        room: true,
        auditEntries: true
      }
    });
  }

  await createAuditEntry({
    reservationId: reservation.id,
    action: parsed.data.bookingStatus === BookingStatus.CANCELLED ? "CANCELLED" : "UPDATED",
    actorName: parsed.data.requesterName,
    actorEmail: parsed.data.requesterEmail,
    actorRole: parsed.data.createdByRole,
    notes: parsed.data.cancellationNotes || parsed.data.remarks,
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
      parsed.data.bookingStatus === BookingStatus.CANCELLED ? "cancelled" : "updated",
      `${serializedFresh.guestCompany} in ${fresh.room.name}`
    )
  });
}
