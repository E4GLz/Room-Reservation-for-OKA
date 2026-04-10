import { NextResponse } from "next/server";
import { BookingStatus, ManagerApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isLegacyReservationSchemaError, serializeReservation } from "@/lib/reservations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const managerEmail = searchParams.get("managerEmail");

  if (!managerEmail) {
    return NextResponse.json({ error: "Manager email is required." }, { status: 400 });
  }

  const manager = await prisma.user.findUnique({
    where: { email: managerEmail }
  });

  if (!manager) {
    return NextResponse.json([]);
  }

  let reservations;

  try {
    reservations = await prisma.reservation.findMany({
      where: {
        managerId: manager.id,
        bookingStatus: BookingStatus.PENDING,
        managerApprovalStatus: ManagerApprovalStatus.PENDING
      },
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

    return NextResponse.json([]);
  }

  return NextResponse.json(reservations.map(serializeReservation));
}
