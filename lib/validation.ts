import { BookingStatus, RoomStatus, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import { RESERVATION_TYPES } from "@/lib/constants";

export const roomSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  type: z.string().min(2).max(80),
  capacity: z.coerce.number().int().min(1).max(500),
  location: z.string().min(2).max(80),
  notes: z.string().max(400).optional().or(z.literal("")),
  status: z.nativeEnum(RoomStatus)
});

export const reservationSchema = z
  .object({
    roomId: z.string().min(1),
    reservationDate: z.string().min(1),
    reservationEndDate: z.string().min(1),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    reservationType: z.enum(RESERVATION_TYPES),
    guestCompany: z.string().min(2).max(120),
    guestName: z.string().max(120).optional().or(z.literal("")),
    guestCompanyLogo: z.string().max(240).optional().or(z.literal("")),
    chargedCompany: z.string().min(2).max(120),
    chargedDepartment: z.string().min(2).max(160),
    materialsToDisplay: z.string().max(800).optional().or(z.literal("")),
    foodServiceRequired: z.boolean(),
    foodServiceLocation: z.string().max(160).optional().or(z.literal("")),
    requesterName: z.string().min(2).max(120),
    requesterEmail: z.string().email(),
    contactNumber: z.string().max(40).optional().or(z.literal("")),
    attendeesCount: z.coerce.number().int().min(1).max(1000),
    remarks: z.string().max(800).optional().or(z.literal("")),
    bookingStatus: z.nativeEnum(BookingStatus),
    createdByRole: z.nativeEnum(UserRole),
    overrideCapacity: z.boolean().optional(),
    cancellationNotes: z.string().max(400).optional().or(z.literal(""))
  })
  .refine((value) => value.endTime > value.startTime, {
    path: ["endTime"],
    message: "End time must be after start time."
  })
  .refine((value) => value.reservationEndDate >= value.reservationDate, {
    path: ["reservationEndDate"],
    message: "Date to must be on or after date from."
  })
  .refine((value) => (!value.foodServiceRequired ? true : Boolean(value.foodServiceLocation?.trim())), {
    path: ["foodServiceLocation"],
    message: "Food service room or location is required when food service is requested."
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  remember: z.boolean().optional()
});

export const userSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phoneNumber: z.string().max(40).optional().or(z.literal("")),
  password: z.string().min(6).max(120).optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "STANDARD"]),
  status: z.nativeEnum(UserStatus)
});

export const profileSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phoneNumber: z.string().max(40).optional().or(z.literal("")),
    currentPassword: z.string().max(120).optional().or(z.literal("")),
    newPassword: z.string().max(120).optional().or(z.literal(""))
  })
  .refine((value) => (!value.newPassword ? true : Boolean(value.currentPassword)), {
    path: ["currentPassword"],
    message: "Current password is required to set a new password."
  })
  .refine((value) => (!value.newPassword ? true : value.newPassword.length >= 6), {
    path: ["newPassword"],
    message: "New password must be at least 6 characters."
  });

export const blockedDaySchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  label: z.string().min(2).max(120),
  notes: z.string().max(240).optional().or(z.literal(""))
});

export const settingsSchema = z
  .object({
    siteTitle: z.string().min(2).max(120),
    siteTitleArabic: z.string().max(120).optional().or(z.literal("")),
    siteDescription: z.string().min(10).max(300),
    workWeekStart: z.coerce.number().int().min(0).max(6),
    workWeekEnd: z.coerce.number().int().min(0).max(6),
    upcomingReminderHours: z.coerce.number().int().min(1).max(168),
    blockedDays: z.array(blockedDaySchema)
  })
  .refine((value) => value.workWeekStart !== value.workWeekEnd, {
    path: ["workWeekEnd"],
    message: "Workweek start and end must be different days."
  });
