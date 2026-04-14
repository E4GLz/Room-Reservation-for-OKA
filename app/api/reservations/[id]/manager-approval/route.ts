import { NextResponse } from "next/server";
import { BookingStatus, ManagerApprovalStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { buildNotification, createAuditEntry, isLegacyReservationSchemaError, serializeReservation } from "@/lib/reservations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
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
      { error: "Manager approval requires the latest database schema. Please run Prisma db push first." },
      { status: 400 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const canReview = auth.user.role === "ADMIN" || existing.managerId === auth.user.id;
  if (!canReview) {
    return NextResponse.json({ error: "You do not have access to review this request." }, { status: 403 });
  }

  if (existing.createdByRole !== UserRole.STANDARD) {
    return NextResponse.json({ error: "Manager approval is only required for staff bookings." }, { status: 400 });
  }

  if (existing.managerApprovalStatus !== ManagerApprovalStatus.PENDING) {
    return NextResponse.json({ error: "This request has already been reviewed by a manager." }, { status: 400 });
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      managerApprovalStatus:
        action === "approve" ? ManagerApprovalStatus.APPROVED : ManagerApprovalStatus.REJECTED,
      managerReviewedAt: new Date(),
      managerReviewerName: auth.user.name,
      managerReviewerEmail: auth.user.email,
      bookingStatus: action === "approve" ? BookingStatus.PENDING : BookingStatus.CANCELLED,
      cancelledAt: action === "reject" ? new Date() : null,
      cancellationNotes:
        action === "reject" ? body.notes || "Rejected during manager review." : existing.cancellationNotes
    },
    include: {
      room: true,
      auditEntries: true
    }
  });

  await createAuditEntry({
    reservationId: reservation.id,
    action: action === "approve" ? "MANAGER_APPROVED" : "MANAGER_REJECTED",
    actorName: auth.user.name,
    actorEmail: auth.user.email,
    actorRole: auth.user.role,
    notes:
      action === "approve"
        ? body.notes || "Approved by direct manager and forwarded to admin."
        : body.notes || "Rejected by direct manager.",
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
      "updated",
      action === "approve"
        ? `${serializedFresh.guestCompany} approved by manager and sent to admin`
        : `${serializedFresh.guestCompany} rejected by manager`
    )
  });
}
