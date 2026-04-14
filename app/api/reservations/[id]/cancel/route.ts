import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
import { buildNotification, createAuditEntry, serializeReservation } from "@/lib/reservations";
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!existing) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      bookingStatus: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationNotes: body.cancellationNotes || "Cancelled from planner"
    },
    include: {
      room: true,
      auditEntries: true
    }
  });

  await createAuditEntry({
    reservationId: reservation.id,
    action: "CANCELLED",
    actorName: auth.user.name,
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    notes: body.cancellationNotes || "Cancelled from planner",
    snapshot: reservation
  });

  const fresh = await prisma.reservation.findUniqueOrThrow({
    where: { id },
    include: { room: true, auditEntries: { orderBy: { createdAt: "desc" } } }
  });

  const serializedFresh = serializeReservation(fresh);

  return NextResponse.json({
    reservation: serializedFresh,
    notification: buildNotification("cancelled", `${serializedFresh.guestCompany} in ${fresh.room.name}`)
  });
}
