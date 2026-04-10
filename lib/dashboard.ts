import { BookingStatus, type Reservation, type Room } from "@prisma/client";
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  differenceInMinutes,
  startOfDay,
  startOfMonth,
  subMonths
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { serializeReservation } from "@/lib/reservations";
import { getAppSettings } from "@/lib/settings";
import type { DashboardPayload } from "@/lib/types";
export const dynamic = 'force-dynamic';

type ReservationWithRoom = Reservation & { room: Room };

function isLegacySchemaError(error: unknown) {
  return error instanceof Error && error.message.includes("reservationEndDate");
}

function getReservationEndDateCompat(reservation: ReservationWithRoom & Record<string, unknown>) {
  return reservation.reservationEndDate instanceof Date ? reservation.reservationEndDate : reservation.reservationDate;
}

async function getDashboardQueries(params: {
  monthStart: Date;
  monthEnd: Date;
  todayStart: Date;
  tomorrowEnd: Date;
  legacy: boolean;
}) {
  const { monthStart, monthEnd, todayStart, tomorrowEnd, legacy } = params;

  return Promise.all([
    prisma.reservation.findMany({
      where: legacy
        ? {
            reservationDate: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        : {
            reservationDate: {
              lte: monthEnd
            },
            reservationEndDate: {
              gte: monthStart
            }
          },
      include: { room: true }
    }),
    prisma.room.findMany({
      where: { status: "ACTIVE" }
    }),
    prisma.reservation.findMany({
      where: legacy
        ? {
            reservationDate: {
              gte: todayStart,
              lte: tomorrowEnd
            },
            bookingStatus: { not: BookingStatus.CANCELLED }
          }
        : {
            reservationDate: {
              lte: tomorrowEnd
            },
            reservationEndDate: {
              gte: todayStart
            },
            bookingStatus: { not: BookingStatus.CANCELLED }
          },
      include: { room: true },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    }),
    prisma.reservation.findMany({
      include: { room: true }
    }),
    prisma.reservation.findMany({
      where: legacy
        ? {
            bookingStatus: BookingStatus.PENDING,
            createdByRole: "STANDARD",
            reservationDate: {
              gte: todayStart
            }
          }
        : {
            bookingStatus: BookingStatus.PENDING,
            createdByRole: "STANDARD",
            reservationEndDate: {
              gte: todayStart
            }
          },
      include: { room: true },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }],
      take: 6
    }),
    prisma.user.findMany({
      where: {
        role: "ADMIN",
        status: "ACTIVE"
      },
      orderBy: { email: "asc" }
    }),
    getAppSettings()
  ]);
}

function getReservationStartDateTime(reservation: ReservationWithRoom & Record<string, unknown>) {
  const [hours, minutes] = reservation.startTime.split(":").map(Number);
  const reservationDate = reservation.reservationDate;
  return new Date(
    reservationDate.getFullYear(),
    reservationDate.getMonth(),
    reservationDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

export async function getDashboardData(): Promise<DashboardPayload> {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const tomorrowStart = startOfDay(addDays(today, 1));
  const tomorrowEnd = endOfDay(addDays(today, 1));
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  let queryResults: Awaited<ReturnType<typeof getDashboardQueries>>;

  try {
    queryResults = await getDashboardQueries({
      monthStart,
      monthEnd,
      todayStart,
      tomorrowEnd,
      legacy: false
    });
  } catch (error) {
    if (!isLegacySchemaError(error)) {
      throw error;
    }

    queryResults = await getDashboardQueries({
      monthStart,
      monthEnd,
      todayStart,
      tomorrowEnd,
      legacy: true
    });
  }

  const [thisMonthReservations, rooms, upcomingReservations, allReservations, pendingApprovals, adminUsers, settings] = queryResults;

  const activeThisMonth = thisMonthReservations.filter((item) => item.bookingStatus !== BookingStatus.CANCELLED);
  const confirmedThisMonth = activeThisMonth.filter((item) => item.bookingStatus === BookingStatus.CONFIRMED);
  const pendingThisMonth = activeThisMonth.filter((item) => item.bookingStatus === BookingStatus.PENDING);
  const adminCreatedThisMonth = activeThisMonth.filter((item) => item.createdByRole === "ADMIN");
  const standardRequestedThisMonth = activeThisMonth.filter((item) => item.createdByRole === "STANDARD");
  const reminderHours = settings?.upcomingReminderHours ?? 24;
  const reminderRecipientEmails = adminUsers.map((user) => user.email);

  const bookingsByRoom = rooms.map((room) => ({
    name: room.name,
    total: activeThisMonth.filter((reservation) => reservation.roomId === room.id).length
  }));

  const eventTypeMap = new Map<string, number>();
  activeThisMonth.forEach((reservation) => {
    eventTypeMap.set(reservation.eventType, (eventTypeMap.get(reservation.eventType) ?? 0) + 1);
  });

  const daysInMonth = monthEnd.getDate();
  const utilizationByRoom = rooms.map((room) => {
    const usedDays = new Set<string>();
    activeThisMonth
      .filter((reservation) => reservation.roomId === room.id)
      .forEach((reservation) => {
        eachDayOfInterval({
          start: reservation.reservationDate,
          end: getReservationEndDateCompat(reservation as ReservationWithRoom & Record<string, unknown>)
        }).forEach((date) => usedDays.add(format(date, "yyyy-MM-dd")));
      });

    return {
      name: room.name,
      utilization: Number(((usedDays.size / daysInMonth) * 100).toFixed(1))
    };
  });

  const currentMonthTotal = activeThisMonth.length;
  const previousMonth = subMonths(today, 1);
  const previousMonthTotal = allReservations.filter(
    (reservation) =>
      reservation.reservationDate.getMonth() === previousMonth.getMonth() &&
      reservation.reservationDate.getFullYear() === previousMonth.getFullYear() &&
      reservation.bookingStatus !== BookingStatus.CANCELLED
  ).length;

  const monthOverMonthDelta = previousMonthTotal === 0 ? currentMonthTotal * 100 : Number((((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100).toFixed(1));
  const averageUtilization =
    utilizationByRoom.length === 0
      ? 0
      : Number(
          (
            utilizationByRoom.reduce((sum, room) => sum + room.utilization, 0) / utilizationByRoom.length
          ).toFixed(1)
        );

  const sortedByBookings = [...bookingsByRoom].sort((a, b) => b.total - a.total);
  const sortedByUtilization = [...utilizationByRoom].sort((a, b) => a.utilization - b.utilization);
  const highestUtilizationRoom = [...utilizationByRoom].sort((a, b) => b.utilization - a.utilization)[0];

  const busiestDaysMap = new Map<string, number>();
  activeThisMonth.forEach((reservation) => {
    eachDayOfInterval({
      start: reservation.reservationDate,
      end: getReservationEndDateCompat(reservation as ReservationWithRoom & Record<string, unknown>)
    }).forEach((date) => {
      const key = format(date, "yyyy-MM-dd");
      busiestDaysMap.set(key, (busiestDaysMap.get(key) ?? 0) + 1);
    });
  });

  const busiestDays = Array.from(busiestDaysMap.entries())
    .map(([date, total]) => ({
      date,
      label: format(new Date(date), "dd MMM"),
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekdayMap = new Map(weekdayOrder.map((day) => [day, 0]));
  activeThisMonth.forEach((reservation) => {
    eachDayOfInterval({
      start: reservation.reservationDate,
      end: getReservationEndDateCompat(reservation as ReservationWithRoom & Record<string, unknown>)
    }).forEach((date) => {
      const key = format(date, "EEE");
      weekdayMap.set(key, (weekdayMap.get(key) ?? 0) + 1);
    });
  });

  const requesterActivityMap = new Map<string, { email: string; name: string; total: number; pending: number; confirmed: number }>();
  activeThisMonth.forEach((reservation) => {
    const existing = requesterActivityMap.get(reservation.requesterEmail) ?? {
      email: reservation.requesterEmail,
      name: reservation.requesterName,
      total: 0,
      pending: 0,
      confirmed: 0
    };

    existing.total += 1;
    if (reservation.bookingStatus === BookingStatus.PENDING) {
      existing.pending += 1;
    }
    if (reservation.bookingStatus === BookingStatus.CONFIRMED) {
      existing.confirmed += 1;
    }

    requesterActivityMap.set(reservation.requesterEmail, existing);
  });

  const activityByRequester = Array.from(requesterActivityMap.values()).sort((a, b) => b.total - a.total);

  const upcomingAdminReminders = upcomingReservations
    .filter(
      (reservation) =>
        reservation.bookingStatus === BookingStatus.CONFIRMED &&
        ((reservation as ReservationWithRoom & Record<string, unknown>).reservationType === "Meeting" ||
          reservation.eventType === "Meeting")
    )
    .map((reservation) => {
      const startDateTime = getReservationStartDateTime(reservation as ReservationWithRoom & Record<string, unknown>);
      return {
        reservation,
        startsInHours: Number((differenceInMinutes(startDateTime, today) / 60).toFixed(1))
      };
    })
    .filter((item) => item.startsInHours >= 0 && item.startsInHours <= reminderHours)
    .map((item) => ({
      id: item.reservation.id,
      subject: `Upcoming meeting reminder: ${item.reservation.guestCompany} in ${item.reservation.room.name}`,
      recipientEmails: reminderRecipientEmails,
      reservation: serializeReservation({
        ...item.reservation,
        auditEntries: []
      } as ReservationWithRoom & { auditEntries: [] }),
      startsInHours: item.startsInHours
    }))
    .sort((a, b) => a.startsInHours - b.startsInHours);

  return {
    totals: {
      totalThisMonth: currentMonthTotal,
      confirmedThisMonth: confirmedThisMonth.length,
      pendingThisMonth: pendingThisMonth.length,
      cancelledThisMonth: thisMonthReservations.filter((item) => item.bookingStatus === BookingStatus.CANCELLED).length,
      adminCreatedThisMonth: adminCreatedThisMonth.length,
      standardRequestedThisMonth: standardRequestedThisMonth.length,
      todayCount: upcomingReservations.filter((item) => item.reservationDate <= todayEnd && getReservationEndDateCompat(item as ReservationWithRoom & Record<string, unknown>) >= todayStart).length,
      tomorrowCount: upcomingReservations.filter((item) => item.reservationDate <= tomorrowEnd && getReservationEndDateCompat(item as ReservationWithRoom & Record<string, unknown>) >= tomorrowStart).length,
      activeRooms: rooms.length
    },
    highlights: {
      averageUtilization,
      monthOverMonthDelta,
      busiestRoom: sortedByBookings[0] ?? { name: "No data", total: 0 },
      highestUtilizationRoom: highestUtilizationRoom ?? { name: "No data", utilization: 0 },
      leastUsedRoom: sortedByUtilization[0] ?? { name: "No data", utilization: 0 }
    },
    bookingsByRoom,
    bookingsByEventType: Array.from(eventTypeMap.entries()).map(([type, total]) => ({ type, total })),
    utilizationByRoom,
    busiestDays,
    weekdayPattern: weekdayOrder.map((day) => ({ day, total: weekdayMap.get(day) ?? 0 })),
    activityByRequester,
    defaultUserActivity: {
      total: 0,
      pending: 0,
      confirmed: 0,
      shareOfMonthlyTotal: 0
    },
    adminReminderConfig: {
      hours: reminderHours,
      recipientEmails: reminderRecipientEmails
    },
    upcomingAdminReminders,
    upcoming: upcomingReservations.map((reservation) =>
      serializeReservation({
        ...reservation,
        auditEntries: []
      } as ReservationWithRoom & { auditEntries: [] })
    ),
    pendingApprovals: pendingApprovals.map((reservation) =>
      serializeReservation({
        ...reservation,
        auditEntries: []
      } as ReservationWithRoom & { auditEntries: [] })
    ),
    monthlyTrend: Array.from({ length: 6 }).map((_, index) => {
      const target = subMonths(today, 5 - index);
      return {
        label: format(target, "MMM"),
        total: allReservations.filter(
          (reservation) =>
            reservation.reservationDate.getMonth() === target.getMonth() &&
            reservation.reservationDate.getFullYear() === target.getFullYear() &&
            reservation.bookingStatus !== BookingStatus.CANCELLED
        ).length
      };
    })
  };
}
