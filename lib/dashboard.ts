import { BookingStatus, type Reservation, type Room } from "@prisma/client";
import {
  addDays,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  max as maxDate,
  startOfDay,
  startOfMonth,
  subMonths
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { serializeReservation } from "@/lib/reservations";
import { getAppSettings } from "@/lib/settings";
import type { AppUser, DashboardPayload } from "@/lib/types";
import { getWorkWeekDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DashboardRoom = Pick<Room, "id" | "name" | "type">;
type DashboardRoomWithDetails = Pick<
  Room,
  "id" | "name" | "type" | "location" | "status" | "capacity" | "code" | "notes" | "createdAt" | "updatedAt"
>;
type DashboardReservation = Pick<
  Reservation,
  | "id"
  | "reservationCode"
  | "roomId"
  | "reservationDate"
  | "reservationEndDate"
  | "startTime"
  | "endTime"
  | "reservationType"
  | "guestCompany"
  | "guestName"
  | "guestCompanyLogo"
  | "chargedCompany"
  | "chargedDepartment"
  | "materialsToDisplay"
  | "foodServiceRequired"
  | "bookingCompany"
  | "meetingName"
  | "eventType"
  | "requesterName"
  | "requesterEmail"
  | "contactNumber"
  | "attendeesCount"
  | "remarks"
  | "bookingStatus"
  | "managerId"
  | "managerApprovalStatus"
  | "managerReviewedAt"
  | "managerReviewerName"
  | "managerReviewerEmail"
  | "createdByRole"
  | "overrideCapacity"
  | "cancelledAt"
  | "cancellationNotes"
  | "createdAt"
  | "updatedAt"
> & {
  room: DashboardRoomWithDetails;
};

const reservationSelect = {
  id: true,
  reservationCode: true,
  roomId: true,
  reservationDate: true,
  reservationEndDate: true,
  startTime: true,
  endTime: true,
  reservationType: true,
  guestCompany: true,
  guestName: true,
  guestCompanyLogo: true,
  chargedCompany: true,
  chargedDepartment: true,
  materialsToDisplay: true,
  foodServiceRequired: true,
  bookingCompany: true,
  meetingName: true,
  eventType: true,
  requesterName: true,
  requesterEmail: true,
  contactNumber: true,
  attendeesCount: true,
  remarks: true,
  bookingStatus: true,
  managerId: true,
  managerApprovalStatus: true,
  managerReviewedAt: true,
  managerReviewerName: true,
  managerReviewerEmail: true,
  createdByRole: true,
  overrideCapacity: true,
  cancelledAt: true,
  cancellationNotes: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      status: true,
      capacity: true,
      code: true,
      notes: true,
      createdAt: true,
      updatedAt: true
    }
  }
} as const;

function isLegacySchemaError(error: unknown) {
  return error instanceof Error && error.message.includes("reservationEndDate");
}

function getReservationEndDateCompat(reservation: DashboardReservation & Record<string, unknown>) {
  return reservation.reservationEndDate instanceof Date ? reservation.reservationEndDate : reservation.reservationDate;
}

function getReservationStartDateTime(reservation: DashboardReservation & Record<string, unknown>) {
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

function getReservationOccupiedHours(reservation: DashboardReservation & Record<string, unknown>) {
  const startMinutes = reservation.startTime
    .split(":")
    .map(Number)
    .reduce((total, value, index) => total + value * (index === 0 ? 60 : 1), 0);
  const endMinutes = reservation.endTime
    .split(":")
    .map(Number)
    .reduce((total, value, index) => total + value * (index === 0 ? 60 : 1), 0);
  const dailyMinutes = Math.max(endMinutes - startMinutes, 0);
  const dayCount = eachDayOfInterval({
    start: reservation.reservationDate,
    end: getReservationEndDateCompat(reservation)
  }).length;

  return Number(((dailyMinutes / 60) * dayCount).toFixed(1));
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
      select: reservationSelect
    }),
    prisma.room.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        type: true
      }
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
      select: reservationSelect,
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    }),
    prisma.reservation.findMany({
      select: reservationSelect
    }),
    prisma.reservation.findMany({
      where: legacy
        ? {
            bookingStatus: BookingStatus.PENDING,
            createdByRole: { not: "ADMIN" },
            reservationDate: {
              gte: todayStart
            }
          }
        : {
            bookingStatus: BookingStatus.PENDING,
            createdByRole: { not: "ADMIN" },
            managerApprovalStatus: { in: ["APPROVED", "NOT_REQUIRED"] },
            reservationEndDate: {
              gte: todayStart
            }
          },
      select: reservationSelect,
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }],
      take: 6
    }),
    prisma.user.findMany({
      where: {
        role: "ADMIN",
        status: "ACTIVE"
      },
      select: { email: true },
      orderBy: { email: "asc" }
    }),
    prisma.drinkOrder.findMany({
      where: {
        submittedAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
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
    }),
    getAppSettings()
  ]);
}

function buildMonthlySeries(
  reservations: Array<DashboardReservation & Record<string, unknown>>,
  valueSelector: (reservation: DashboardReservation & Record<string, unknown>) => number,
  dateSelector: (reservation: DashboardReservation & Record<string, unknown>) => Date = (reservation) => reservation.reservationDate
) {
  if (reservations.length === 0) {
    return [];
  }

  const sortedDates = reservations.map(dateSelector).sort((a, b) => a.getTime() - b.getTime());
  const earliestReservationDate = sortedDates[0];
  const latestReservationDate = sortedDates[sortedDates.length - 1];
  const totalsByMonth = new Map<string, number>();

  reservations.forEach((reservation) => {
    const date = dateSelector(reservation);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
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

    series.push({
      label: format(cursor, "MMMM yyyy"),
      shortLabel: format(cursor, "MMM"),
      year,
      month,
      total: Number((totalsByMonth.get(key) ?? 0).toFixed(1))
    });

    cursor = addMonths(cursor, 1);
  }

  return series;
}

export async function getDashboardData(viewer?: AppUser | null): Promise<DashboardPayload> {
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

  const [thisMonthReservations, rooms, upcomingReservations, allReservations, pendingApprovals, adminUsers, hospitalityOrders, settings] = queryResults;

  const activeThisMonth = thisMonthReservations.filter((item) => item.bookingStatus !== BookingStatus.CANCELLED);
  const activeAllTime = allReservations.filter((item) => item.bookingStatus !== BookingStatus.CANCELLED);
  const confirmedThisMonth = activeThisMonth.filter((item) => item.bookingStatus === BookingStatus.CONFIRMED);
  const pendingThisMonth = activeThisMonth.filter((item) => item.bookingStatus === BookingStatus.PENDING);
  const adminCreatedThisMonth = activeThisMonth.filter((item) => item.createdByRole === "ADMIN");
  const standardRequestedThisMonth = activeThisMonth.filter((item) => item.createdByRole === "STANDARD");
  const reminderHours = settings?.upcomingReminderHours ?? 24;
  const reminderRecipientEmails = adminUsers.map((user) => user.email);

  const bookingsByRoomMap = new Map<string, { name: string; total: number }>();
  const occupiedHoursByRoomMap = new Map<string, { name: string; hours: number }>();
  const eventTypeMap = new Map<string, number>();
  const busiestDaysMap = new Map<string, number>();
  const monthlyCountMap = new Map<string, number>();
  const monthlyHoursMap = new Map<string, number>();

  activeAllTime.forEach((reservation) => {
    bookingsByRoomMap.set(reservation.roomId, {
      name: reservation.room.name,
      total: (bookingsByRoomMap.get(reservation.roomId)?.total ?? 0) + 1
    });

    const occupiedHours = getReservationOccupiedHours(reservation as DashboardReservation & Record<string, unknown>);
    occupiedHoursByRoomMap.set(reservation.roomId, {
      name: reservation.room.name,
      hours: Number((((occupiedHoursByRoomMap.get(reservation.roomId)?.hours ?? 0) + occupiedHours)).toFixed(1))
    });

    eventTypeMap.set(reservation.eventType, (eventTypeMap.get(reservation.eventType) ?? 0) + 1);

    const monthKey = `${reservation.reservationDate.getFullYear()}-${String(reservation.reservationDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyCountMap.set(monthKey, (monthlyCountMap.get(monthKey) ?? 0) + 1);
    monthlyHoursMap.set(monthKey, Number(((monthlyHoursMap.get(monthKey) ?? 0) + occupiedHours).toFixed(1)));

    eachDayOfInterval({
      start: reservation.reservationDate,
      end: getReservationEndDateCompat(reservation as DashboardReservation & Record<string, unknown>)
    }).forEach((date) => {
      const key = format(date, "yyyy-MM-dd");
      busiestDaysMap.set(key, (busiestDaysMap.get(key) ?? 0) + 1);
    });
  });

  const daysInMonth = monthEnd.getDate();
  const utilizationByRoom = rooms.map((room) => {
    const usedDays = new Set<string>();
    activeThisMonth
      .filter((reservation) => reservation.roomId === room.id)
      .forEach((reservation) => {
        eachDayOfInterval({
          start: reservation.reservationDate,
          end: getReservationEndDateCompat(reservation as DashboardReservation & Record<string, unknown>)
        }).forEach((date) => usedDays.add(format(date, "yyyy-MM-dd")));
      });

    return {
      name: room.name,
      utilization: Number(((usedDays.size / daysInMonth) * 100).toFixed(1))
    };
  });

  const currentMonthTotal = activeThisMonth.length;
  const previousMonth = subMonths(today, 1);
  const previousMonthTotal = activeAllTime.filter(
    (reservation) =>
      reservation.reservationDate.getMonth() === previousMonth.getMonth() &&
      reservation.reservationDate.getFullYear() === previousMonth.getFullYear()
  ).length;

  const monthOverMonthDelta =
    previousMonthTotal === 0 ? currentMonthTotal * 100 : Number((((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100).toFixed(1));
  const averageUtilization =
    utilizationByRoom.length === 0
      ? 0
      : Number((utilizationByRoom.reduce((sum, room) => sum + room.utilization, 0) / utilizationByRoom.length).toFixed(1));

  const bookingsByRoom = rooms.map((room) => ({
    name: room.name,
    total: bookingsByRoomMap.get(room.id)?.total ?? 0
  }));
  const occupiedHoursByRoom = rooms.map((room) => ({
    name: room.name,
    hours: occupiedHoursByRoomMap.get(room.id)?.hours ?? 0
  }));

  const sortedByBookings = [...bookingsByRoom].sort((a, b) => b.total - a.total);
  const sortedByUtilization = [...utilizationByRoom].sort((a, b) => a.utilization - b.utilization);
  const highestUtilizationRoom = [...utilizationByRoom].sort((a, b) => b.utilization - a.utilization)[0];

  const busiestDays = Array.from(busiestDaysMap.entries())
    .map(([date, total]) => ({
      date,
      label: format(new Date(date), "dd MMM"),
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const workWeekDayIndexes = getWorkWeekDays(settings.workWeekStart, settings.workWeekEnd);
  const weekdayOrder = workWeekDayIndexes.map((dayIndex) => weekdayLabels[dayIndex]);
  const weekdayMap = new Map(weekdayOrder.map((day) => [day, 0]));
  activeAllTime.forEach((reservation) => {
    eachDayOfInterval({
      start: reservation.reservationDate,
      end: getReservationEndDateCompat(reservation as DashboardReservation & Record<string, unknown>)
    }).forEach((date) => {
      const key = format(date, "EEE");
      if (weekdayMap.has(key)) {
        weekdayMap.set(key, (weekdayMap.get(key) ?? 0) + 1);
      }
    });
  });

  const requesterActivityMap = new Map<string, { email: string; name: string; total: number; pending: number; confirmed: number }>();
  const hospitalityItemsMap = new Map<string, number>();
  const hospitalityRoomsMap = new Map<string, number>();

  const hospitalitySummary = hospitalityOrders.reduce(
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
        ((reservation as DashboardReservation & Record<string, unknown>).reservationType === "Meeting" ||
          reservation.eventType === "Meeting")
    )
    .map((reservation) => {
      const startDateTime = getReservationStartDateTime(reservation as DashboardReservation & Record<string, unknown>);
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
      } as Reservation & { room: Room; auditEntries: [] }),
      startsInHours: item.startsInHours
    }))
    .sort((a, b) => a.startsInHours - b.startsInHours);

  const allTimeWithRecords = activeAllTime as Array<DashboardReservation & Record<string, unknown>>;
  const payload: DashboardPayload = {
    totals: {
      totalThisMonth: currentMonthTotal,
      confirmedThisMonth: confirmedThisMonth.length,
      pendingThisMonth: pendingThisMonth.length,
      cancelledThisMonth: thisMonthReservations.filter((item) => item.bookingStatus === BookingStatus.CANCELLED).length,
      foodServiceThisMonth: activeThisMonth.filter((item) => item.foodServiceRequired).length,
      occupiedHoursThisMonth: Number(
        activeThisMonth.reduce((sum, reservation) => sum + getReservationOccupiedHours(reservation as DashboardReservation & Record<string, unknown>), 0).toFixed(1)
      ),
      adminCreatedThisMonth: adminCreatedThisMonth.length,
      standardRequestedThisMonth: standardRequestedThisMonth.length,
      todayCount: upcomingReservations.filter((item) => item.reservationDate <= todayEnd && getReservationEndDateCompat(item as DashboardReservation & Record<string, unknown>) >= todayStart).length,
      tomorrowCount: upcomingReservations.filter((item) => item.reservationDate <= tomorrowEnd && getReservationEndDateCompat(item as DashboardReservation & Record<string, unknown>) >= tomorrowStart).length,
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
    occupiedHoursByRoom,
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
    upcoming: upcomingReservations.map((reservation) =>
      serializeReservation({
        ...reservation,
        auditEntries: []
      } as Reservation & { room: Room; auditEntries: [] })
    ),
    pendingApprovals: pendingApprovals.map((reservation) =>
      serializeReservation({
        ...reservation,
        auditEntries: []
      } as Reservation & { room: Room; auditEntries: [] })
    ),
    monthlyTrend: buildMonthlySeries(allTimeWithRecords, () => 1),
    occupiedHoursTrend: buildMonthlySeries(
      allTimeWithRecords,
      (reservation) => getReservationOccupiedHours(reservation)
    ).map((item) => ({
      label: item.label,
      shortLabel: item.shortLabel,
      year: item.year,
      month: item.month,
      hours: item.total
    }))
  };

  if (!viewer || viewer.role === "ADMIN") {
    return payload;
  }

  const userAllTime = activeAllTime.filter((reservation) => reservation.requesterEmail === viewer.email);
  const userThisMonth = activeThisMonth.filter((reservation) => reservation.requesterEmail === viewer.email);
  const userUpcoming = upcomingReservations.filter((reservation) => reservation.requesterEmail === viewer.email);
  const userCancelledThisMonth = thisMonthReservations.filter(
    (reservation) => reservation.requesterEmail === viewer.email && reservation.bookingStatus === BookingStatus.CANCELLED
  );
  const userConfirmedThisMonth = userThisMonth.filter((reservation) => reservation.bookingStatus === BookingStatus.CONFIRMED);
  const userPendingThisMonth = userThisMonth.filter((reservation) => reservation.bookingStatus === BookingStatus.PENDING);

  return {
    ...payload,
    totals: {
      ...payload.totals,
      totalThisMonth: userThisMonth.length,
      confirmedThisMonth: userConfirmedThisMonth.length,
      pendingThisMonth: userPendingThisMonth.length,
      cancelledThisMonth: userCancelledThisMonth.length,
      foodServiceThisMonth: userThisMonth.filter((reservation) => reservation.foodServiceRequired).length,
      occupiedHoursThisMonth: Number(
        userThisMonth.reduce((sum, reservation) => sum + getReservationOccupiedHours(reservation as DashboardReservation & Record<string, unknown>), 0).toFixed(1)
      )
    },
    highlights: {
      averageUtilization: 0,
      monthOverMonthDelta: 0,
      busiestRoom: { name: "No data", total: 0 },
      highestUtilizationRoom: { name: "No data", utilization: 0 },
      leastUsedRoom: { name: "No data", utilization: 0 }
    },
    bookingsByRoom: [],
    occupiedHoursByRoom: [],
    bookingsByEventType: [],
    utilizationByRoom: [],
    busiestDays: [],
    weekdayPattern: [],
    upcoming: userUpcoming.map((reservation) =>
      serializeReservation({
        ...reservation,
        auditEntries: []
      } as Reservation & { room: Room; auditEntries: [] })
    ),
    pendingApprovals: [],
    activityByRequester: [],
    defaultUserActivity: {
      total: userThisMonth.length,
      pending: userPendingThisMonth.length,
      confirmed: userConfirmedThisMonth.length,
      shareOfMonthlyTotal: 100
    },
    adminReminderConfig: {
      hours: reminderHours,
      recipientEmails: []
    },
    upcomingAdminReminders: [],
    hospitality: {
      totalOrders: 0,
      newOrders: 0,
      preparingOrders: 0,
      servedOrders: 0,
      cancelledOrders: 0,
      roomsWithOrders: 0,
      topItems: [],
      topRooms: []
    },
    monthlyTrend: buildMonthlySeries(
      userAllTime as Array<DashboardReservation & Record<string, unknown>>,
      () => 1
    ),
    occupiedHoursTrend: buildMonthlySeries(
      userAllTime as Array<DashboardReservation & Record<string, unknown>>,
      (reservation) => getReservationOccupiedHours(reservation)
    ).map((item) => ({
      label: item.label,
      shortLabel: item.shortLabel,
      year: item.year,
      month: item.month,
      hours: item.total
    }))
  };
}
