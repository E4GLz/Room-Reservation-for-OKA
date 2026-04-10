import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export const DEFAULT_SETTINGS = {
  id: "default",
  siteTitle: "Room Reservation Hub",
  siteDescription:
    "Internal platform for room bookings, approvals, and planning.",
  workWeekStart: 0,
  workWeekEnd: 4,
  upcomingReminderHours: 24,
};

export async function ensureAppSettings() {
  try {
    const existing = await prisma.appSettings.findUnique({
      where: { id: DEFAULT_SETTINGS.id },
      include: { blockedDays: { orderBy: { date: "asc" } } },
    });

    if (existing) {
      return {
        ...existing,
        upcomingReminderHours:
          existing.upcomingReminderHours ??
          DEFAULT_SETTINGS.upcomingReminderHours,
      };
    }

    return prisma.appSettings.upsert({
      where: { id: DEFAULT_SETTINGS.id },
      update: {},
      create: DEFAULT_SETTINGS,
      include: { blockedDays: { orderBy: { date: "asc" } } },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("AppSettings") ||
        error.message.includes("upcomingReminderHours"))
    ) {
      return {
        ...DEFAULT_SETTINGS,
        blockedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    throw error;
  }
}

export async function getAppSettings() {
  return ensureAppSettings();
}