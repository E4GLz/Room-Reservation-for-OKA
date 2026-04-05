import { BookingStatus, RoomStatus } from "@prisma/client";

export const RESERVATION_TYPES = ["Workshop", "Meeting", "Event", "Lab"] as const;

export const EVENT_TYPES = RESERVATION_TYPES;

export const BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CANCELLED
];

export const ROOM_STATUSES: RoomStatus[] = [RoomStatus.ACTIVE, RoomStatus.INACTIVE];

export const ROOM_TYPES = RESERVATION_TYPES;

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
] as const;
