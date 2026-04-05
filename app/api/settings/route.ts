import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { serializeSettings } from "@/lib/utils";
import { settingsSchema } from "@/lib/validation";

function normalizeDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(serializeSettings(settings));
}

export async function PUT(request: Request) {
  await getAppSettings();
  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let updated;

  try {
    updated = await prisma.appSettings.update({
      where: { id: "default" },
      data: {
        siteTitle: parsed.data.siteTitle,
        siteDescription: parsed.data.siteDescription,
        workWeekStart: parsed.data.workWeekStart,
        workWeekEnd: parsed.data.workWeekEnd,
        upcomingReminderHours: parsed.data.upcomingReminderHours,
        blockedDays: {
          deleteMany: {},
          create: parsed.data.blockedDays.map((day) => ({
            date: normalizeDateOnly(day.date),
            label: day.label,
            notes: day.notes || null
          }))
        }
      },
      include: {
        blockedDays: {
          orderBy: { date: "asc" }
        }
      }
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("upcomingReminderHours")) {
      throw error;
    }

    updated = await prisma.appSettings.update({
      where: { id: "default" },
      data: {
        siteTitle: parsed.data.siteTitle,
        siteDescription: parsed.data.siteDescription,
        workWeekStart: parsed.data.workWeekStart,
        workWeekEnd: parsed.data.workWeekEnd,
        blockedDays: {
          deleteMany: {},
          create: parsed.data.blockedDays.map((day) => ({
            date: normalizeDateOnly(day.date),
            label: day.label,
            notes: day.notes || null
          }))
        }
      },
      include: {
        blockedDays: {
          orderBy: { date: "asc" }
        }
      }
    });
  }

  return NextResponse.json(serializeSettings(updated));
}
