import type { AppSettings, BlockedDay, BookingStatus, Room, RoomStatus, UserRole, UserStatus } from "@prisma/client";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
};

export type UserRecord = AppUser & {
  passwordHash?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type RoomRecord = Room & {
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ReservationAuditRecord = {
  id: string;
  reservationId: string;
  action: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  notes: string | null;
  snapshot: string | null;
  createdAt: string;
};

export type ReservationRecord = {
  id: string;
  reservationCode: string;
  roomId: string;
  reservationDate: string;
  reservationEndDate: string;
  startTime: string;
  endTime: string;
  reservationType: string;
  guestCompany: string;
  guestName: string | null;
  guestCompanyLogo: string | null;
  chargedCompany: string;
  chargedDepartment: string;
  materialsToDisplay: string | null;
  foodServiceRequired: boolean;
  foodServiceLocation: string | null;
  bookingCompany: string;
  meetingName: string;
  eventType: string;
  requesterName: string;
  requesterEmail: string;
  contactNumber: string | null;
  attendeesCount: number;
  remarks: string | null;
  bookingStatus: BookingStatus;
  createdByRole: UserRole;
  overrideCapacity: boolean;
  cancelledAt: string | null;
  cancellationNotes: string | null;
  createdAt: string;
  updatedAt: string;
  room: RoomRecord;
  auditEntries?: ReservationAuditRecord[];
};

export type PlannerView = "month" | "week" | "day" | "list";

export type FilterState = {
  roomId: string;
  eventType: string;
  status: BookingStatus | "";
  search: string;
};

export type DashboardPayload = {
  totals: {
    totalThisMonth: number;
    confirmedThisMonth: number;
    pendingThisMonth: number;
    cancelledThisMonth: number;
    adminCreatedThisMonth: number;
    standardRequestedThisMonth: number;
    todayCount: number;
    tomorrowCount: number;
    activeRooms: number;
  };
  highlights: {
    averageUtilization: number;
    monthOverMonthDelta: number;
    busiestRoom: { name: string; total: number };
    highestUtilizationRoom: { name: string; utilization: number };
    leastUsedRoom: { name: string; utilization: number };
  };
  bookingsByRoom: Array<{ name: string; total: number }>;
  bookingsByEventType: Array<{ type: string; total: number }>;
  utilizationByRoom: Array<{ name: string; utilization: number }>;
  busiestDays: Array<{ date: string; label: string; total: number }>;
  weekdayPattern: Array<{ day: string; total: number }>;
  upcoming: ReservationRecord[];
  pendingApprovals: ReservationRecord[];
  activityByRequester: Array<{
    email: string;
    name: string;
    total: number;
    pending: number;
    confirmed: number;
  }>;
  defaultUserActivity: {
    total: number;
    pending: number;
    confirmed: number;
    shareOfMonthlyTotal: number;
  };
  adminReminderConfig: {
    hours: number;
    recipientEmails: string[];
  };
  upcomingAdminReminders: Array<{
    id: string;
    subject: string;
    recipientEmails: string[];
    reservation: ReservationRecord;
    startsInHours: number;
  }>;
  monthlyTrend: Array<{ label: string; total: number }>;
};

export type ReportsPayload = {
  activeRooms: number;
  averageAttendees: number;
  totalBookings: number;
  cancellationRate: number;
  foodServiceCount: number;
  topCompanies: Array<{ company: string; total: number }>;
  reservationTypeMix: Array<{ type: string; total: number }>;
  roomTypeMix: Array<{ type: string; total: number }>;
  monthlyTrend: Array<{ label: string; total: number }>;
};

export type ReservationInput = {
  roomId: string;
  reservationDate: string;
  reservationEndDate: string;
  startTime: string;
  endTime: string;
  reservationType: string;
  guestCompany: string;
  guestName?: string;
  guestCompanyLogo?: string;
  chargedCompany: string;
  chargedDepartment: string;
  materialsToDisplay?: string;
  foodServiceRequired: boolean;
  foodServiceLocation?: string;
  requesterName: string;
  requesterEmail: string;
  contactNumber?: string;
  attendeesCount: number;
  remarks?: string;
  bookingStatus: BookingStatus;
  createdByRole: UserRole;
  overrideCapacity?: boolean;
  cancellationNotes?: string;
};

export type NotificationEvent = {
  type: "created" | "updated" | "cancelled" | "conflict";
  message: string;
  timestamp: string;
};

export type PlannerCell = {
  dateKey: string;
  roomId: string;
  reservations: ReservationRecord[];
};

export type RoomFormValues = {
  code: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  notes?: string;
  status: RoomStatus;
};

export type BlockedDayRecord = BlockedDay & {
  date: string | Date;
  createdAt?: string | Date;
};

export type AppSettingsRecord = AppSettings & {
  blockedDays: BlockedDayRecord[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UserFormValues = {
  name: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
};

export type ProfileFormValues = {
  name: string;
  email: string;
  phoneNumber?: string;
  currentPassword?: string;
  newPassword?: string;
};

export type SettingsFormValues = {
  siteTitle: string;
  siteDescription: string;
  workWeekStart: number;
  workWeekEnd: number;
  upcomingReminderHours: number;
  blockedDays: Array<{
    id?: string;
    date: string;
    label: string;
    notes?: string;
  }>;
};
