import { type ClassValue, clsx } from "clsx";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  parseISO,
  set,
  startOfMonth,
  startOfWeek
} from "date-fns";
import type { AppSettingsRecord, BlockedDayRecord, PlannerView, ReservationRecord, UserRecord } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function formatLongDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "EEE, dd MMM yyyy");
}

export function formatMonthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

export function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRoleLabel(role: string | null | undefined) {
  if (role === "ADMIN") {
    return "Admin";
  }

  if (role === "STANDARD") {
    return "Staff";
  }

  return role ?? "Unknown";
}

export function toInputDate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function fromInputDate(value: string) {
  const parsed = parseISO(value);
  return set(parsed, {
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });
}

export function getDateRangeForView(baseDate: Date, view: PlannerView, workWeekStart = 1, workWeekEnd = 5) {
  if (view === "week") {
    const start = startOfWeek(baseDate, { weekStartsOn: workWeekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const workWeekDays = getWorkWeekDays(workWeekStart, workWeekEnd);
    return workWeekDays.map((_, index) => addDays(start, index));
  }

  if (view === "day") {
    return [baseDate];
  }

  return eachDayOfInterval({
    start: startOfMonth(baseDate),
    end: endOfMonth(baseDate)
  });
}

export function shiftDateByView(baseDate: Date, view: PlannerView, direction: "next" | "prev") {
  const delta = direction === "next" ? 1 : -1;
  if (view === "week") {
    return addWeeks(baseDate, delta);
  }

  if (view === "day") {
    return addDays(baseDate, delta);
  }

  return addMonths(baseDate, delta);
}

export function isBlockedDay(date: Date, blockedDays: Array<{ date: string | Date }>) {
  return blockedDays.some((blockedDay) => {
    const blockedDate = typeof blockedDay.date === "string" ? blockedDay.date : toDateKey(blockedDay.date);
    return blockedDate === toDateKey(date);
  });
}

export function isWeekend(date: Date, settings?: Pick<AppSettingsRecord, "workWeekStart" | "workWeekEnd"> | null) {
  if (!settings) {
    const weekday = date.getDay();
    return weekday === 5 || weekday === 6;
  }

  const weekday = date.getDay();
  const workingDays = getWorkWeekDays(settings.workWeekStart, settings.workWeekEnd);
  return !workingDays.includes(weekday);
}

export function isCurrentDay(date: Date) {
  return isToday(date);
}

export function getStatusTone(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "PENDING":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function getManagerApprovalLabel(reservation: Pick<ReservationRecord, "createdByRole" | "bookingStatus" | "managerApprovalStatus">) {
  if (reservation.createdByRole === "ADMIN" || reservation.managerApprovalStatus === "NOT_REQUIRED") {
    return "No manager approval";
  }

  if (reservation.managerApprovalStatus === "PENDING") {
    return "Waiting for manager";
  }

  if (reservation.managerApprovalStatus === "APPROVED") {
    return reservation.bookingStatus === "PENDING" ? "Waiting for admin" : "Manager approved";
  }

  if (reservation.managerApprovalStatus === "REJECTED") {
    return "Rejected by manager";
  }

  return "Manager review";
}

export function getManagerApprovalTone(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "APPROVED":
      return "bg-blue-100 text-blue-800 ring-blue-200";
    case "REJECTED":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function hasTimeConflict(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function dateRangesOverlap(startA: string | Date, endA: string | Date, startB: string | Date, endB: string | Date) {
  const aStart = typeof startA === "string" ? parseISO(startA) : startA;
  const aEnd = typeof endA === "string" ? parseISO(endA) : endA;
  const bStart = typeof startB === "string" ? parseISO(startB) : startB;
  const bEnd = typeof endB === "string" ? parseISO(endB) : endB;

  return aStart <= bEnd && aEnd >= bStart;
}

export function filterReservations(
  reservations: ReservationRecord[],
  filters: {
    roomId: string;
    eventType: string;
    status: string;
    search: string;
  }
) {
  const search = filters.search.trim().toLowerCase();
  return reservations.filter((reservation) => {
    const matchesRoom = !filters.roomId || reservation.roomId === filters.roomId;
    const matchesType = !filters.eventType || reservation.eventType === filters.eventType;
    const matchesStatus = !filters.status || reservation.bookingStatus === filters.status;
    const matchesSearch =
      !search ||
      reservation.guestCompany.toLowerCase().includes(search) ||
      reservation.chargedCompany.toLowerCase().includes(search) ||
      reservation.chargedDepartment.toLowerCase().includes(search);

    return matchesRoom && matchesType && matchesStatus && matchesSearch;
  });
}

export function groupReservationsByDateAndRoom(
  reservations: ReservationRecord[],
  dates: Date[],
  roomIds: string[]
) {
  const map = new Map<string, ReservationRecord[]>();

  for (const date of dates) {
    for (const roomId of roomIds) {
      map.set(`${toDateKey(date)}:${roomId}`, []);
    }
  }

  reservations.forEach((reservation) => {
    const reservationDates = eachDayOfInterval({
      start: parseISO(reservation.reservationDate),
      end: parseISO(reservation.reservationEndDate)
    });

    for (const date of reservationDates) {
      const key = `${toDateKey(date)}:${reservation.roomId}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(reservation);
        existing.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      }
    }
  });

  return map;
}

export function reservationCanBeEditedByUser(
  reservation: ReservationRecord,
  user: { email: string; role: string } | null
) {
  if (!user) {
    return false;
  }

  return user.role === "ADMIN";
}

export function describeNotification(type: "created" | "updated" | "cancelled" | "conflict", context: string) {
  const prefix =
    type === "created"
      ? "Booking created"
      : type === "updated"
        ? "Booking updated"
        : type === "cancelled"
          ? "Booking cancelled"
          : "Conflict detected";

  return `${prefix}: ${context}`;
}

export function getRelativeUpcomingLabel(date: Date) {
  if (isToday(date)) {
    return "Today";
  }

  if (isSameDay(date, addDays(new Date(), 1))) {
    return "Tomorrow";
  }

  return format(date, "EEE");
}

export function getWorkWeekDays(start: number, end: number) {
  const days: number[] = [];
  let current = start;

  while (true) {
    days.push(current);
    if (current === end) {
      break;
    }
    current = (current + 1) % 7;
  }

  return days;
}

export function serializeUser(user: UserRecord) {
  const { passwordHash, manager, directReports, managedReservations, ...rest } = user as UserRecord & {
    manager?: { name?: string; email?: string } | null;
    directReports?: unknown;
    managedReservations?: unknown;
  };

  return {
    ...rest,
    name: toTitleCase(user.name),
    managerName:
      manager && typeof manager === "object" && "name" in manager
        ? toTitleCase(String(manager.name))
        : ("managerName" in user ? user.managerName : null),
    managerEmail:
      manager && typeof manager === "object" && "email" in manager
        ? String(manager.email)
        : ("managerEmail" in user ? user.managerEmail : null),
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt
  };
}

export function serializeBlockedDay(day: BlockedDayRecord) {
  return {
    ...day,
    date: day.date instanceof Date ? toDateKey(day.date) : String(day.date).slice(0, 10),
    createdAt: day.createdAt instanceof Date ? day.createdAt.toISOString() : day.createdAt
  };
}

export function serializeSettings(settings: AppSettingsRecord) {
  return {
    ...settings,
    upcomingReminderHours: settings.upcomingReminderHours,
    createdAt: settings.createdAt instanceof Date ? settings.createdAt.toISOString() : settings.createdAt,
    updatedAt: settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : settings.updatedAt,
    blockedDays: settings.blockedDays.map((day) => serializeBlockedDay(day))
  };
}
