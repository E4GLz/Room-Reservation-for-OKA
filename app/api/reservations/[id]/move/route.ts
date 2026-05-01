import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
import {
  buildNotification,
  createAuditEntry,
  sendRoomShiftNotificationEmail,
  serializeReservation,
  validateReservationBusinessRules
} from "@/lib/reservations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json()) as { roomId?: string; reservationType?: string; reason?: string };
  const roomId = body.roomId?.trim();
  const reservationType = body.reservationType?.trim();
  const reason = body.reason?.trim();

  if (!roomId) {
    return NextResponse.json({ error: "Please select the new room." }, { status: 400 });
  }

  if (!reservationType) {
    return NextResponse.json({ error: "Please select the new reservation type." }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "Please enter the reason for moving this reservation." }, { status: 400 });
  }

  const existing = await prisma.reservation.findUnique({
    where: { id },
    include: {
      room: true,
      auditEntries: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (existing.roomId === roomId) {
    return NextResponse.json({ error: "Please choose a different room." }, { status: 400 });
  }

  const validation = await validateReservationBusinessRules(
    {
      roomId,
      reservationDate: existing.reservationDate.toISOString().slice(0, 10),
      reservationEndDate: ("reservationEndDate" in existing && existing.reservationEndDate instanceof Date
        ? existing.reservationEndDate
        : existing.reservationDate
      )
        .toISOString()
        .slice(0, 10),
      startTime: existing.startTime,
      endTime: existing.endTime,
      reservationType,
      guestCompany: (existing as typeof existing & { guestCompany?: string }).guestCompany ?? existing.bookingCompany,
      guestName: (existing as typeof existing & { guestName?: string | null }).guestName ?? "",
      guestCompanyLogo: (existing as typeof existing & { guestCompanyLogo?: string | null }).guestCompanyLogo ?? "",
      chargedCompany: (existing as typeof existing & { chargedCompany?: string }).chargedCompany ?? existing.bookingCompany,
      chargedDepartment: (existing as typeof existing & { chargedDepartment?: string }).chargedDepartment ?? existing.meetingName,
      materialsToDisplay: (existing as typeof existing & { materialsToDisplay?: string | null }).materialsToDisplay ?? "",
      foodServiceRequired: (existing as typeof existing & { foodServiceRequired?: boolean }).foodServiceRequired ?? false,
      foodServiceLocation: (existing as typeof existing & { foodServiceLocation?: string | null }).foodServiceLocation ?? "",
      requesterName: existing.requesterName,
      requesterEmail: existing.requesterEmail,
      contactNumber: existing.contactNumber ?? "",
      attendeesCount: existing.attendeesCount,
      remarks: existing.remarks ?? "",
      bookingStatus: existing.bookingStatus,
      createdByRole: existing.createdByRole,
      overrideCapacity: existing.overrideCapacity,
      cancellationNotes: existing.cancellationNotes ?? ""
    },
    existing.id
  );

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

  const moved = await prisma.reservation.update({
    where: { id },
    data: {
      roomId,
      reservationType,
      eventType: reservationType
    },
    include: {
      room: true,
      auditEntries: true
    }
  });

  await createAuditEntry({
    reservationId: moved.id,
    action: "ROOM_REASSIGNED",
    actorName: auth.user.name,
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    notes: `Room changed from ${existing.room.name} to ${moved.room.name}. Type changed from ${((existing as typeof existing & { reservationType?: string }).reservationType ?? existing.eventType)} to ${reservationType}. Reason: ${reason}`,
    snapshot: moved
  });

  const fresh = await prisma.reservation.findUniqueOrThrow({
    where: { id },
    include: { room: true, auditEntries: { orderBy: { createdAt: "desc" } } }
  });

  const serialized = serializeReservation(fresh);

  let emailWarning: string | null = null;
  try {
    await sendRoomShiftNotificationEmail({
      reservation: serialized,
      previousRoomName: existing.room.name,
      reason
    });
  } catch (error) {
    emailWarning = error instanceof Error ? error.message : "Email notification could not be sent.";
  }

  return NextResponse.json({
    reservation: serialized,
    notification: buildNotification("updated", `${serialized.guestCompany} moved to ${fresh.room.name}`),
    emailWarning
  });
}
