import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { format, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  const [rooms, reservations] = await Promise.all([
    prisma.room.findMany(),
    prisma.reservation.findMany({
      include: { room: true }
    })
  ]);

  const activeReservations = reservations.filter((item) => item.bookingStatus !== BookingStatus.CANCELLED);
  const companyMap = new Map<string, number>();
  const reservationTypeMap = new Map<string, number>();
  const roomTypeMap = new Map<string, number>();

  activeReservations.forEach((reservation) => {
    const chargedCompany = (reservation as typeof reservation & { chargedCompany?: string }).chargedCompany ?? reservation.bookingCompany;
    const reservationType = (reservation as typeof reservation & { reservationType?: string }).reservationType ?? reservation.eventType;

    companyMap.set(chargedCompany, (companyMap.get(chargedCompany) ?? 0) + 1);
    reservationTypeMap.set(reservationType, (reservationTypeMap.get(reservationType) ?? 0) + 1);
    roomTypeMap.set(reservation.room.type, (roomTypeMap.get(reservation.room.type) ?? 0) + 1);
  });

  return NextResponse.json({
    activeRooms: rooms.filter((room) => room.status === "ACTIVE").length,
    totalBookings: activeReservations.length,
    averageAttendees: activeReservations.length
      ? Math.round(activeReservations.reduce((sum, reservation) => sum + reservation.attendeesCount, 0) / activeReservations.length)
      : 0,
    cancellationRate: reservations.length
      ? Math.round((reservations.filter((item) => item.bookingStatus === BookingStatus.CANCELLED).length / reservations.length) * 100)
      : 0,
    foodServiceCount: activeReservations.filter((reservation) => reservation.foodServiceRequired).length,
    topCompanies: Array.from(companyMap.entries())
      .map(([company, total]) => ({ company, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    reservationTypeMix: Array.from(reservationTypeMap.entries()).map(([type, total]) => ({ type, total })),
    roomTypeMix: Array.from(roomTypeMap.entries()).map(([type, total]) => ({ type, total })),
    monthlyTrend: Array.from({ length: 6 }).map((_, index) => {
      const target = subMonths(new Date(), 5 - index);
      return {
        label: format(target, "MMM"),
        total: activeReservations.filter(
          (reservation) =>
            reservation.reservationDate.getMonth() === target.getMonth() &&
            reservation.reservationDate.getFullYear() === target.getFullYear()
        ).length
      };
    })
  });
}
