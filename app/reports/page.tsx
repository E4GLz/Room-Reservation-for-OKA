import { PageHeader } from "@/components/ui/page-header";
import { ReportsPage } from "@/components/reports/reports-page";
import { BookingStatus } from "@prisma/client";
import { addMonths, eachDayOfInterval, format, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdminPageUser } from "@/lib/server-auth";
export const dynamic = 'force-dynamic';

function getOccupiedHours(reservation: {
  startTime: string;
  endTime: string;
  reservationDate: Date;
  reservationEndDate?: Date | null;
}) {
  const [startHour, startMinute] = reservation.startTime.split(":").map(Number);
  const [endHour, endMinute] = reservation.endTime.split(":").map(Number);
  const dailyHours = Math.max(endHour * 60 + endMinute - (startHour * 60 + startMinute), 0) / 60;
  const endDate = reservation.reservationEndDate ?? reservation.reservationDate;
  const dayCount = eachDayOfInterval({
    start: reservation.reservationDate,
    end: endDate
  }).length;

  return Number((dailyHours * dayCount).toFixed(1));
}

function buildMonthlySeries<T extends { reservationDate: Date }>(
  reservations: T[],
  valueSelector: (reservation: T) => number
) {
  if (reservations.length === 0) {
    return [];
  }

  const sortedDates = reservations
    .map((reservation) => reservation.reservationDate)
    .sort((a, b) => a.getTime() - b.getTime());
  const earliestReservationDate = sortedDates[0];
  const latestReservationDate = sortedDates[sortedDates.length - 1];
  const totalsByMonth = new Map<string, number>();

  reservations.forEach((reservation) => {
    const year = reservation.reservationDate.getFullYear();
    const month = reservation.reservationDate.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    totalsByMonth.set(key, Number(((totalsByMonth.get(key) ?? 0) + valueSelector(reservation)).toFixed(1)));
  });

  const series: Array<{ label: string; shortLabel: string; year: number; month: number; total: number }> = [];

  let cursor = startOfMonth(earliestReservationDate);
  const end = startOfMonth(latestReservationDate);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const total = Number((totalsByMonth.get(key) ?? 0).toFixed(1));

    series.push({
      label: format(cursor, "MMMM yyyy"),
      shortLabel: format(cursor, "MMM"),
      year,
      month,
      total
    });

    cursor = addMonths(cursor, 1);
  }

  return series;
}

async function getReports() {
  const [activeRoomsCount, reservations, drinkOrders] = await Promise.all([
    prisma.room.count({ where: { status: "ACTIVE" } }),
    prisma.reservation.findMany({
      select: {
        reservationDate: true,
        reservationEndDate: true,
        startTime: true,
        endTime: true,
        reservationType: true,
        eventType: true,
        chargedCompany: true,
        bookingCompany: true,
        attendeesCount: true,
        bookingStatus: true,
        foodServiceRequired: true,
        room: {
          select: {
            name: true,
            type: true
          }
        }
      }
    }),
    prisma.drinkOrder.findMany({
      select: {
        status: true,
        itemNameSnapshot: true,
        roomId: true,
        room: {
          select: {
            name: true
          }
        }
      }
    })
  ]);
  const activeReservations = reservations.filter((item) => item.bookingStatus !== BookingStatus.CANCELLED);
  const companyMap = new Map<string, number>();
  const reservationTypeMap = new Map<string, number>();
  const roomTypeMap = new Map<string, number>();
  const occupiedHoursByRoomMap = new Map<string, number>();
  const hospitalityItemsMap = new Map<string, number>();
  const hospitalityRoomsMap = new Map<string, number>();

  const hospitalitySummary = drinkOrders.reduce(
    (summary, order) => {
      summary.totalOrders += 1;
      if (order.status === "NEW") {
        summary.newOrders += 1;
      }
      if (order.status === "PREPARING") {
        summary.preparingOrders += 1;
      }
      if (order.status === "SERVED") {
        summary.servedOrders += 1;
      }
      if (order.status === "CANCELLED") {
        summary.cancelledOrders += 1;
      }

      hospitalityItemsMap.set(order.itemNameSnapshot, (hospitalityItemsMap.get(order.itemNameSnapshot) ?? 0) + 1);
      hospitalityRoomsMap.set(order.room.name, (hospitalityRoomsMap.get(order.room.name) ?? 0) + 1);

      return summary;
    },
    {
      totalOrders: 0,
      newOrders: 0,
      preparingOrders: 0,
      servedOrders: 0,
      cancelledOrders: 0
    }
  );

  activeReservations.forEach((reservation) => {
    const chargedCompany = (reservation as typeof reservation & { chargedCompany?: string }).chargedCompany ?? reservation.bookingCompany;
    const reservationType = (reservation as typeof reservation & { reservationType?: string }).reservationType ?? reservation.eventType;
    const occupiedHours = getOccupiedHours(reservation as typeof reservation & { reservationEndDate?: Date | null });

    companyMap.set(chargedCompany, (companyMap.get(chargedCompany) ?? 0) + 1);
    reservationTypeMap.set(reservationType, (reservationTypeMap.get(reservationType) ?? 0) + 1);
    roomTypeMap.set(reservation.room.type, (roomTypeMap.get(reservation.room.type) ?? 0) + 1);
    occupiedHoursByRoomMap.set(reservation.room.name, Number(((occupiedHoursByRoomMap.get(reservation.room.name) ?? 0) + occupiedHours).toFixed(1)));
  });

  return {
    activeRooms: activeRoomsCount,
    totalBookings: activeReservations.length,
    occupiedHours: Number(activeReservations.reduce((sum, reservation) => sum + getOccupiedHours(reservation as typeof reservation & { reservationEndDate?: Date | null }), 0).toFixed(1)),
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
    hospitality: {
      ...hospitalitySummary,
      roomsWithOrders: hospitalityRoomsMap.size,
      topItems: Array.from(hospitalityItemsMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
      topRooms: Array.from(hospitalityRoomsMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
    },
    occupiedHoursByRoom: Array.from(occupiedHoursByRoomMap.entries())
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8),
    monthlyTrend: buildMonthlySeries(activeReservations, () => 1),
    occupiedHoursTrend: buildMonthlySeries(
      activeReservations,
      (reservation) => getOccupiedHours(reservation as typeof reservation & { reservationEndDate?: Date | null })
    ).map((item) => ({
      label: item.label,
      shortLabel: item.shortLabel,
      year: item.year,
      month: item.month,
      hours: item.total
    }))
  };
}

export default async function Reports() {
  await requireAdminPageUser();
  const data = await getReports();

  return (
    <>
      <PageHeader
        eyebrow="Summary"
        title="Reports"
        description="Review booking demand, usage trends, attendance patterns, and room activity across the reservation platform."
      />
      <ReportsPage data={data} />
    </>
  );
}
