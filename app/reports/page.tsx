import { PageHeader } from "@/components/ui/page-header";
import { ReportsPage } from "@/components/reports/reports-page";
import { BookingStatus } from "@prisma/client";
import { addMonths, eachDayOfInterval, format, max as maxDate, min as minDate, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
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

  const earliestReservationDate = minDate(reservations.map((reservation) => reservation.reservationDate));
  const latestReservationDate = maxDate(reservations.map((reservation) => reservation.reservationDate));
  const series: Array<{ label: string; shortLabel: string; year: number; month: number; total: number }> = [];

  let cursor = startOfMonth(earliestReservationDate);
  const end = startOfMonth(latestReservationDate);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const total = Number(
      reservations
        .filter(
          (reservation) =>
            reservation.reservationDate.getFullYear() === year &&
            reservation.reservationDate.getMonth() + 1 === month
        )
        .reduce((sum, reservation) => sum + valueSelector(reservation), 0)
        .toFixed(1)
    );

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
  const occupiedHoursByRoomMap = new Map<string, number>();

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
    activeRooms: rooms.filter((room) => room.status === "ACTIVE").length,
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
