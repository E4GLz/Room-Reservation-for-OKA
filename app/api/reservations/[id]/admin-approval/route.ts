import { NextResponse } from "next/server";
import { BookingStatus, ManagerApprovalStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
import { buildNotification, createAuditEntry, isLegacyReservationSchemaError, serializeReservation } from "@/lib/reservations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action === "reject" ? "reject" : "approve";

  let existing;

  try {
    existing = await prisma.reservation.findUnique({
      where: { id },
      include: {
        room: true,
        auditEntries: true
      }
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    return NextResponse.json(
      { error: "Admin approval requires the latest database schema. Please run Prisma db push first." },
      { status: 400 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (existing.bookingStatus !== BookingStatus.PENDING) {
    return NextResponse.json({ error: "Only pending requests can be reviewed by admin." }, { status: 400 });
  }

  if (
    existing.createdByRole === UserRole.STANDARD &&
    existing.managerApprovalStatus === ManagerApprovalStatus.PENDING
  ) {
    return NextResponse.json(
      { error: "This request still requires manager approval before admin confirmation." },
      { status: 400 }
    );
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      bookingStatus: action === "approve" ? BookingStatus.CONFIRMED : BookingStatus.CANCELLED,
      cancelledAt: action === "reject" ? new Date() : null,
      cancellationNotes: action === "reject" ? body.notes || "Rejected during admin review." : existing.cancellationNotes
    },
    include: {
      room: true,
      auditEntries: true
    }
  });

  await createAuditEntry({
    reservationId: reservation.id,
    action: action === "approve" ? "ADMIN_APPROVED" : "ADMIN_REJECTED",
    actorName: auth.user.name,
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    notes:
      action === "approve"
        ? body.notes || "Approved by admin and confirmed."
        : body.notes || "Rejected during admin review.",
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
      action === "approve" ? "updated" : "cancelled",
      action === "approve"
        ? `${serializedFresh.guestCompany} approved by admin`
        : `${serializedFresh.guestCompany} rejected by admin`
    )
  });
}
