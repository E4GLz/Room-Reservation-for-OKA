import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
import { isLegacyReservationSchemaError, serializeReservation } from "@/lib/reservations";

export async function GET() {
  const auth = await requireApiRole("ADMIN");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  let reservations;

  try {
    reservations = await prisma.reservation.findMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdByRole: { not: "ADMIN" },
        managerApprovalStatus: { in: ["APPROVED", "NOT_REQUIRED"] }
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

    reservations = await prisma.reservation.findMany({
      where: {
        bookingStatus: BookingStatus.PENDING,
        createdByRole: { not: "ADMIN" }
      },
      include: {
        room: true,
        auditEntries: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  }

  return NextResponse.json(reservations.map(serializeReservation));
}
