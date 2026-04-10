import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export const DEFAULT_SETTINGS = {
  id: "default",
  siteTitle: "Obeikan Knowledge Academy",
  siteTitleArabic: "أكاديمية العبيكان للمعرفة",
  siteDescription: "Internal platform for room reservations, approvals, visitor agenda, and planning operations across Obeikan Knowledge Academy.",
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
      const shouldRefreshBranding =
        existing.siteTitle === "Room Reservation Hub" ||
        existing.siteTitle === "Nawras" ||
        existing.siteDescription === "Internal platform for room bookings, approvals, and planning.";

      if (shouldRefreshBranding) {
        return prisma.appSettings.update({
          where: { id: DEFAULT_SETTINGS.id },
          data: {
            siteTitle: DEFAULT_SETTINGS.siteTitle,
            siteTitleArabic: DEFAULT_SETTINGS.siteTitleArabic,
            siteDescription: DEFAULT_SETTINGS.siteDescription
          },
          include: { blockedDays: { orderBy: { date: "asc" } } }
        });
      }

      return {
        ...existing,
        siteTitleArabic: "siteTitleArabic" in existing ? existing.siteTitleArabic ?? DEFAULT_SETTINGS.siteTitleArabic : DEFAULT_SETTINGS.siteTitleArabic,
        upcomingReminderHours: existing.upcomingReminderHours ?? DEFAULT_SETTINGS.upcomingReminderHours
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
      (error.message.includes("AppSettings") || error.message.includes("upcomingReminderHours") || error.message.includes("siteTitleArabic"))
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