import type {
  AppSettings,
  BlockedDay,
  BookingStatus,
  DrinkOrderStatus,
  ManagerApprovalStatus,
  MenuItem,
  MenuItemModifier,
  Room,
  RoomStatus,
  RoomServiceToken,
  UserRole,
  UserStatus
} from "@prisma/client";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  managerId?: string | null;
  managerName?: string | null;
  managerEmail?: string | null;
  role: UserRole;
  status: UserStatus;
};

export type UserRecord = AppUser & {
  passwordHash?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type RoomRecord = Omit<Room, 'createdAt' | 'updatedAt'> & {
  seatLayoutConfig?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type RoomServiceTokenRecord = Omit<RoomServiceToken, "createdAt" | "updatedAt"> & {
  room?: RoomRecord;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  createdAt: string | Date;
};

export type ReservationRecord = {
  id: string;
  reservationCode: string;
  roomId: string;
  reservationDate: string | Date;
  reservationEndDate: string | Date;
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
  bookingCompany: string;
  meetingName: string;
  eventType: string;
  requesterName: string;
  requesterEmail: string;
  contactNumber?: string;
  attendeesCount: number;
  remarks?: string;
  bookingStatus: BookingStatus;
  managerId: string | null;
  managerApprovalStatus: ManagerApprovalStatus;
  managerReviewedAt: string | Date | null;
  managerReviewerName: string | null;
  managerReviewerEmail: string | null;
  createdByRole: UserRole;
  overrideCapacity: boolean;
  cancelledAt?: string | Date | null;
  cancellationNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  room: RoomRecord;
  auditEntries?: ReservationAuditRecord[];
};

export type MenuItemModifierRecord = Omit<MenuItemModifier, "createdAt" | "updatedAt"> & {
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type MenuItemRecord = Omit<MenuItem, "createdAt" | "updatedAt"> & {
  imageAttachment?: string | null;
  modifiers: MenuItemModifierRecord[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type DrinkOrderRecord = {
  id: string;
  reservationId: string | null;
  roomId: string;
  roomServiceTokenId: string | null;
  menuItemId: string;
  guestLabel?: string | null;
  seatKey?: string | null;
  seatLabel?: string | null;
  itemNameSnapshot: string;
  modifierSummary?: string | null;
  customNote?: string | null;
  status: DrinkOrderStatus;
  submittedAt: string | Date;
  preparingAt?: string | Date | null;
  servedAt?: string | Date | null;
  guestReminderRequestedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  room: RoomRecord;
  menuItem: MenuItemRecord;
  reservation?: ReservationRecord | null;
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
    foodServiceThisMonth: number;
    occupiedHoursThisMonth: number;
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
  occupiedHoursByRoom: Array<{ name: string; hours: number }>;
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
  hospitality: {
    totalOrders: number;
    newOrders: number;
    preparingOrders: number;
    servedOrders: number;
    cancelledOrders: number;
    roomsWithOrders: number;
    topItems: Array<{ name: string; total: number }>;
    topRooms: Array<{ name: string; total: number }>;
  };
  monthlyTrend: Array<{ label: string; shortLabel: string; year: number; month: number; total: number }>;
  occupiedHoursTrend: Array<{ label: string; shortLabel: string; year: number; month: number; hours: number }>;
};

export type ReportsPayload = {
  activeRooms: number;
  averageAttendees: number;
  totalBookings: number;
  occupiedHours: number;
  cancellationRate: number;
  foodServiceCount: number;
  topCompanies: Array<{ company: string; total: number }>;
  reservationTypeMix: Array<{ type: string; total: number }>;
  roomTypeMix: Array<{ type: string; total: number }>;
  hospitality: {
    totalOrders: number;
    newOrders: number;
    preparingOrders: number;
    servedOrders: number;
    cancelledOrders: number;
    roomsWithOrders: number;
    topItems: Array<{ name: string; total: number }>;
    topRooms: Array<{ name: string; total: number }>;
  };
  monthlyTrend: Array<{ label: string; shortLabel: string; year: number; month: number; total: number }>;
  occupiedHoursByRoom: Array<{ name: string; hours: number }>;
  occupiedHoursTrend: Array<{ label: string; shortLabel: string; year: number; month: number; hours: number }>;
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
  seatLayoutConfig?: string;
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
  managerId?: string;
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
  siteTitleArabic?: string;
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

export type MenuItemFormValues = {
  name: string;
  nameArabic?: string;
  category: string;
  description?: string;
  descriptionArabic?: string;
  imageAttachment?: string;
  isActive: boolean;
  isOutOfStock: boolean;
  allowCustomNote: boolean;
  sortOrder: number;
  modifiers: Array<{
    id?: string;
    label: string;
    labelArabic?: string;
    isActive: boolean;
    sortOrder: number;
  }>;
};

export type GuestOrderPayload = {
  guestLabel?: string;
  seatKey: string;
  seatLabel: string;
  menuItemId: string;
  selectedModifierIds: string[];
  customNote?: string;
};
