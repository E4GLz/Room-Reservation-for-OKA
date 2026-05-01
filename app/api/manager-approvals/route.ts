import { NextResponse } from "next/server";
import { BookingStatus, ManagerApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { isLegacyReservationSchemaError, serializeReservation } from "@/lib/reservations";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth.response;
  }

  let reservations;

  try {
    reservations = await prisma.reservation.findMany({
      where: {
        managerId: auth.user.id,
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
