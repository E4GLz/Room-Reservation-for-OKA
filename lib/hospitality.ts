import { Prisma, BookingStatus, DrinkOrderStatus, type DrinkOrder, type MenuItem, type MenuItemModifier, type Reservation, type Room, type RoomServiceToken } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DrinkOrderRecord } from "@/lib/types";

type ReservationWithRoom = Reservation & { room: Room };
type MenuItemWithModifiers = MenuItem & { modifiers: MenuItemModifier[] };
type DrinkOrderWithRelations = DrinkOrder & {
  room: Room;
  menuItem: MenuItemWithModifiers;
  reservation: (Reservation & { room: Room }) | null;
};

type TodayMeetingWithRoom = Reservation & { room: Room };

export const HOSPITALITY_ESTIMATE_MINUTES = 10;
export const HOSPITALITY_ESTIMATE_WINDOW_MINUTES = 10;
const HOSPITALITY_TIME_ZONE = "Asia/Riyadh";

export function generateRoomServiceToken() {
  return globalThis.crypto.randomUUID().replace(/-/g, "");
}

export async function ensureRoomServiceToken(roomId: string) {
  const existing = await prisma.roomServiceToken.findUnique({
    where: { roomId }
  });

  if (existing) {
    return existing;
  }

  return prisma.roomServiceToken.create({
    data: {
      roomId,
      token: generateRoomServiceToken()
    }
  });
}

export async function findRoomByServiceToken(token: string) {
  return prisma.roomServiceToken.findUnique({
    where: { token },
    include: {
      room: true
    }
  });
}

export async function findActiveReservationForRoom(roomId: string, when = new Date()) {
  const currentDateKey = toHospitalityDateKey(when);
  const currentTime = toHospitalityTimeKey(when);
  let reservations: ReservationWithRoom[];

  try {
    reservations = await prisma.reservation.findMany({
      where: {
        roomId,
        bookingStatus: BookingStatus.CONFIRMED,
        reservationDate: { lte: new Date(when.getTime() + 2 * 24 * 60 * 60 * 1000) },
        reservationEndDate: { gte: new Date(when.getTime() - 2 * 24 * 60 * 60 * 1000) }
      },
      include: {
        room: true
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

      reservations = await prisma.reservation.findMany({
        where: {
          roomId,
          bookingStatus: BookingStatus.CONFIRMED,
          reservationDate: {
            gte: new Date(when.getTime() - 2 * 24 * 60 * 60 * 1000),
            lte: new Date(when.getTime() + 2 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          room: true
      },
      orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
    });
  }

  const reservationsForToday = reservations.filter((reservation) => {
    const startKey = toHospitalityDateKey(reservation.reservationDate);
    const endKey = toHospitalityDateKey(reservation.reservationEndDate);
    return startKey <= currentDateKey && endKey >= currentDateKey;
  });

  const currentReservation =
    reservationsForToday.find((reservation) => {
      const bufferStart = shiftTime(reservation.startTime, -15);
      const bufferEnd = shiftTime(reservation.endTime, 15);
      return isTimeWithinRange(currentTime, bufferStart, bufferEnd);
    }) ?? null;

  if (currentReservation) {
    return currentReservation;
  }

  const upcomingReservation =
    reservationsForToday.find((reservation) => {
      const currentMinutes = toMinutes(currentTime);
      const reservationStartMinutes = toMinutes(reservation.startTime);
      return reservationStartMinutes >= currentMinutes;
    }) ?? null;

  return upcomingReservation;
}

function toHospitalityDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOSPITALITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function toHospitalityTimeKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: HOSPITALITY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(value);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

function shiftTime(value: string, deltaMinutes: number) {
  const [hours, minutes] = value.split(":").map(Number);
  const total = hours * 60 + minutes + deltaMinutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isTimeWithinRange(value: string, start: string, end: string) {
  const valueMinutes = toMinutes(value);
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (startMinutes <= endMinutes) {
    return valueMinutes >= startMinutes && valueMinutes <= endMinutes;
  }

  return valueMinutes >= startMinutes || valueMinutes <= endMinutes;
}

export function serializeMenuItem(item: MenuItemWithModifiers) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    modifiers: item.modifiers.map((modifier) => ({
      ...modifier,
      createdAt: modifier.createdAt.toISOString(),
      updatedAt: modifier.updatedAt.toISOString()
    }))
  };
}

export function serializeRoomServiceToken(token: RoomServiceToken & { room?: Room | null }) {
  return {
    ...token,
    room: token.room
      ? {
          ...token.room,
          createdAt: token.room.createdAt.toISOString(),
          updatedAt: token.room.updatedAt.toISOString()
        }
      : undefined,
    createdAt: token.createdAt.toISOString(),
    updatedAt: token.updatedAt.toISOString()
  };
}

export function serializeDrinkOrder(order: DrinkOrderWithRelations) {
  const reminderTimestamp = (order as DrinkOrder & { guestReminderRequestedAt?: Date | null }).guestReminderRequestedAt;

  return {
    ...order,
    submittedAt: order.submittedAt.toISOString(),
    preparingAt: order.preparingAt?.toISOString() ?? null,
    servedAt: order.servedAt?.toISOString() ?? null,
    guestReminderRequestedAt: reminderTimestamp?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    room: {
      ...order.room,
      createdAt: order.room.createdAt.toISOString(),
      updatedAt: order.room.updatedAt.toISOString()
    },
    menuItem: serializeMenuItem(order.menuItem),
    reservation: order.reservation
      ? {
          ...order.reservation,
          reservationDate: order.reservation.reservationDate.toISOString(),
          reservationEndDate: order.reservation.reservationEndDate.toISOString(),
          createdAt: order.reservation.createdAt.toISOString(),
          updatedAt: order.reservation.updatedAt.toISOString(),
          cancelledAt: order.reservation.cancelledAt?.toISOString() ?? null,
          room: {
            ...order.reservation.room,
            createdAt: order.reservation.room.createdAt.toISOString(),
            updatedAt: order.reservation.room.updatedAt.toISOString()
          }
        }
      : null
  };
}

export function getEstimatedDeliveryWindow(submittedAt: string | Date) {
  const submitted = typeof submittedAt === "string" ? new Date(submittedAt) : submittedAt;
  const estimateStart = new Date(submitted.getTime() + HOSPITALITY_ESTIMATE_MINUTES * 60_000);
  const estimateEnd = new Date(estimateStart.getTime() + HOSPITALITY_ESTIMATE_WINDOW_MINUTES * 60_000);

  return {
    estimateStart,
    estimateEnd
  };
}

export function serializeTodayMeeting(reservation: TodayMeetingWithRoom) {
  return {
    id: reservation.id,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    meetingTitle: reservation.guestCompany ?? reservation.bookingCompany,
    roomName: reservation.room.name,
    roomLocation: reservation.room.location,
    reservationDate: reservation.reservationDate.toISOString(),
    reservationEndDate: reservation.reservationEndDate.toISOString()
  };
}

export async function listVisibleMenuItems() {
  const items = await prisma.menuItem.findMany({
    where: {
      isActive: true
    },
    include: {
      modifiers: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
      }
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return items.map(serializeMenuItem);
}

export async function listHospitalityMenuItems() {
  const items = await prisma.menuItem.findMany({
    include: {
      modifiers: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
      }
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return items.map(serializeMenuItem);
}

export async function listOpenDrinkOrders() {
  const orders = await prisma.drinkOrder.findMany({
    where: {
      status: {
        in: [DrinkOrderStatus.NEW, DrinkOrderStatus.PREPARING]
      }
    },
    include: {
      room: true,
      menuItem: {
        include: {
          modifiers: true
        }
      },
      reservation: {
        include: {
          room: true
        }
      }
    },
    orderBy: [{ room: { name: "asc" } }, { submittedAt: "asc" }]
  });

  return withDrinkOrderReminderTimestamps(orders.map(serializeDrinkOrder));
}

export async function listCurrentDrinkOrders(when = new Date()) {
  const dayStart = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 0, 0, 0, 0);
  const nextDayStart = new Date(when.getFullYear(), when.getMonth(), when.getDate() + 1, 0, 0, 0, 0);

  const orders = await prisma.drinkOrder.findMany({
    where: {
      submittedAt: {
        gte: dayStart,
        lt: nextDayStart
      },
      status: {
        not: DrinkOrderStatus.CANCELLED
      }
    },
    include: {
      room: true,
      menuItem: {
        include: {
          modifiers: true
        }
      },
      reservation: {
        include: {
          room: true
        }
      }
    },
    orderBy: [{ room: { name: "asc" } }, { submittedAt: "asc" }]
  });

  return withDrinkOrderReminderTimestamps(orders.map(serializeDrinkOrder));
}

export async function findDrinkOrderForGuestTracking(token: string, orderId: string) {
  const order = await prisma.drinkOrder.findFirst({
    where: {
      id: orderId,
      roomServiceToken: {
        token,
        isEnabled: true
      }
    },
    include: {
      room: true,
      menuItem: {
        include: {
          modifiers: true
        }
      },
      reservation: {
        include: {
          room: true
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  const [serialized] = await withDrinkOrderReminderTimestamps([serializeDrinkOrder(order)]);
  return serialized ?? null;
}

function isLegacyReservationSchemaError(error: unknown) {
  return error instanceof Error && error.message.includes("reservationEndDate");
}

async function withDrinkOrderReminderTimestamps(orders: DrinkOrderRecord[]) {
  if (orders.length === 0) {
    return orders;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; guestReminderRequestedAt: Date | string | null }>>(
      Prisma.sql`SELECT "id", "guestReminderRequestedAt" FROM "DrinkOrder" WHERE "id" IN (${Prisma.join(
        orders.map((order) => order.id)
      )})`
    );

    const reminderMap = new Map(
      rows.map((row) => [
        row.id,
        row.guestReminderRequestedAt
          ? row.guestReminderRequestedAt instanceof Date
            ? row.guestReminderRequestedAt.toISOString()
            : new Date(row.guestReminderRequestedAt).toISOString()
          : null
      ])
    );

    return orders.map((order) => ({
      ...order,
      guestReminderRequestedAt: reminderMap.get(order.id) ?? null
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("guestReminderRequestedAt")) {
      return orders.map((order) => ({
        ...order,
        guestReminderRequestedAt: null
      }));
    }

    throw error;
  }
}

export async function listTodayServiceMeetings(when = new Date()) {
  const dayStart = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 23, 59, 59, 999);

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        reservationDate: {
          lte: dayEnd
        },
        reservationEndDate: {
          gte: dayStart
        }
      },
      include: {
        room: true
      },
      orderBy: [{ startTime: "asc" }, { room: { name: "asc" } }]
    });

    return reservations.map(serializeTodayMeeting);
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        reservationDate: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        room: true
      },
      orderBy: [{ startTime: "asc" }, { room: { name: "asc" } }]
    });

    return reservations.map(serializeTodayMeeting);
  }
}
