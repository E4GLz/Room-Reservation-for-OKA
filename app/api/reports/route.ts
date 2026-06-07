import { NextResponse } from "next/server";
import { BookingStatus } from "@prisma/client";
import { format, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
export const dynamic = 'force-dynamic';

function computeOccupiedHours(reservation: {
  startTime: string;
  endTime: string;
  reservationDate: Date;
  reservationEndDate?: Date | null;
}) {
  const toMinutes = (t: string) =>
    t.split(":").map(Number).reduce((s, v, i) => s + v * (i === 0 ? 60 : 1), 0);
  const daily = Math.max(toMinutes(reservation.endTime) - toMinutes(reservation.startTime), 0);
  const start = reservation.reservationDate;
  const end =
    reservation.reservationEndDate instanceof Date
      ? reservation.reservationEndDate
      : start;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number(((daily / 60) * days).toFixed(1));
}

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
  const roomHoursMap = new Map<string, number>();
  const monthHoursMap = new Map<string, number>();

  activeReservations.forEach((reservation) => {
    const chargedCompany =
      (reservation as typeof reservation & { chargedCompany?: string }).chargedCompany ??
      reservation.bookingCompany;
    const reservationType =
      (reservation as typeof reservation & { reservationType?: string }).reservationType ??
      reservation.eventType;

    companyMap.set(chargedCompany, (companyMap.get(chargedCompany) ?? 0) + 1);
    reservationTypeMap.set(reservationType, (reservationTypeMap.get(reservationType) ?? 0) + 1);
    roomTypeMap.set(reservation.room.type, (roomTypeMap.get(reservation.room.type) ?? 0) + 1);

    const hours = computeOccupiedHours(
      reservation as typeof reservation & { reservationEndDate?: Date | null }
    );
    roomHoursMap.set(
      reservation.room.name,
      Number(((roomHoursMap.get(reservation.room.name) ?? 0) + hours).toFixed(1))
    );

    const d = reservation.reservationDate;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthHoursMap.set(monthKey, Number(((monthHoursMap.get(monthKey) ?? 0) + hours).toFixed(1)));
  });

  const monthlyTrend = Array.from({ length: 6 }).map((_, index) => {
    const target = subMonths(new Date(), 5 - index);
    return {
      label: format(target, "MMMM yyyy"),
      shortLabel: format(target, "MMM"),
      year: target.getFullYear(),
      month: target.getMonth() + 1,
      total: activeReservations.filter(
        (reservation) =>
          reservation.reservationDate.getMonth() === target.getMonth() &&
          reservation.reservationDate.getFullYear() === target.getFullYear()
      ).length
    };
  });

  const occupiedHoursTrend = Array.from({ length: 6 }).map((_, index) => {
    const target = subMonths(new Date(), 5 - index);
    const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: format(target, "MMMM yyyy"),
      shortLabel: format(target, "MMM"),
      year: target.getFullYear(),
      month: target.getMonth() + 1,
      hours: monthHoursMap.get(key) ?? 0
    };
  });

  const occupiedHoursByRoom = Array.from(roomHoursMap.entries())
    .map(([name, hours]) => ({ name, hours }))
    .sort((a, b) => b.hours - a.hours);

  return NextResponse.json({
    activeRooms: rooms.filter((room) => room.status === "ACTIVE").length,
    totalBookings: activeReservations.length,
    averageAttendees: activeReservations.length
      ? Math.round(
          activeReservations.reduce((sum, r) => sum + r.attendeesCount, 0) /
            activeReservations.length
        )
      : 0,
    cancellationRate: reservations.length
      ? Math.round(
          (reservations.filter((item) => item.bookingStatus === BookingStatus.CANCELLED).length /
            reservations.length) *
            100
        )
      : 0,
    foodServiceCount: activeReservations.filter((r) => r.foodServiceRequired).length,
    topCompanies: Array.from(companyMap.entries())
      .map(([company, total]) => ({ company, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    reservationTypeMix: Array.from(reservationTypeMap.entries()).map(([type, total]) => ({
      type,
      total
    })),
    roomTypeMix: Array.from(roomTypeMap.entries()).map(([type, total]) => ({ type, total })),
    monthlyTrend,
    occupiedHoursTrend,
    occupiedHoursByRoom,
    hospitality: await getHospitalitySummary()
  });
}

async function getHospitalitySummary() {
  const orders = await prisma.drinkOrder.findMany({
    select: { status: true, itemNameSnapshot: true, room: { select: { name: true } } }
  });

  const itemsMap = new Map<string, number>();
  const roomsMap = new Map<string, number>();
  let newOrders = 0;
  let preparingOrders = 0;
  let servedOrders = 0;
  let cancelledOrders = 0;

  orders.forEach((o) => {
    if (o.status === "NEW") newOrders++;
    if (o.status === "PREPARING") preparingOrders++;
    if (o.status === "SERVED") servedOrders++;
    if (o.status === "CANCELLED") cancelledOrders++;
    itemsMap.set(o.itemNameSnapshot, (itemsMap.get(o.itemNameSnapshot) ?? 0) + 1);
    roomsMap.set(o.room.name, (roomsMap.get(o.room.name) ?? 0) + 1);
  });

  return {
    totalOrders: orders.length,
    newOrders,
    preparingOrders,
    servedOrders,
    cancelledOrders,
    roomsWithOrders: roomsMap.size,
    topItems: Array.from(itemsMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    topRooms: Array.from(roomsMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  };
}
