import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/lib/dashboard";
import { createAuditEntry } from "@/lib/reservations";
import { formatLongDate } from "@/lib/utils";
import { isEmailConfigured, sendEmail } from "@/lib/email";
export const dynamic = 'force-dynamic'

async function runUpcomingReminderDispatch() {
  if (!isEmailConfigured()) {
    return {
      ok: false as const,
      status: 400,
      body: {
        error: "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to your environment."
      }
    };
  }

  const data = await getDashboardData();

  if (data.adminReminderConfig.recipientEmails.length === 0) {
    return {
      ok: false as const,
      status: 400,
      body: {
        error: "No active admin email addresses are available to receive reminders."
      }
    };
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const reminder of data.upcomingAdminReminders) {
    const existingReminder = await prisma.reservationAudit.findFirst({
      where: {
        reservationId: reminder.reservation.id,
        action: "REMINDER_SENT"
      }
    });

    if (existingReminder) {
      skippedCount += 1;
      continue;
    }

    const reservation = reminder.reservation;
    const text = [
      `Upcoming meeting reminder`,
      ``,
      `Company: ${reservation.guestCompany}`,
      `Department: ${reservation.chargedDepartment}`,
      `Room: ${reservation.room.name}`,
      `Date: ${formatLongDate(reservation.reservationDate)}`,
      `Time: ${reservation.startTime} - ${reservation.endTime}`,
      `Attendees: ${reservation.attendeesCount}`,
      `Food service: ${reservation.foodServiceRequired ? `Yes${reservation.foodServiceLocation ? ` (${reservation.foodServiceLocation})` : ""}` : "No"}`,
      `Requested by: ${reservation.requesterName} <${reservation.requesterEmail}>`
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Upcoming meeting reminder</h2>
        <p style="margin: 0 0 8px;"><strong>Company:</strong> ${reservation.guestCompany}</p>
        <p style="margin: 0 0 8px;"><strong>Department:</strong> ${reservation.chargedDepartment}</p>
        <p style="margin: 0 0 8px;"><strong>Room:</strong> ${reservation.room.name}</p>
        <p style="margin: 0 0 8px;"><strong>Date:</strong> ${formatLongDate(reservation.reservationDate)}</p>
        <p style="margin: 0 0 8px;"><strong>Time:</strong> ${reservation.startTime} - ${reservation.endTime}</p>
        <p style="margin: 0 0 8px;"><strong>Attendees:</strong> ${reservation.attendeesCount}</p>
        <p style="margin: 0 0 8px;"><strong>Food service:</strong> ${
          reservation.foodServiceRequired
            ? `Yes${reservation.foodServiceLocation ? ` (${reservation.foodServiceLocation})` : ""}`
            : "No"
        }</p>
        <p style="margin: 0;"><strong>Requested by:</strong> ${reservation.requesterName} (${reservation.requesterEmail})</p>
      </div>
    `;

    await sendEmail({
      to: reminder.recipientEmails,
      subject: reminder.subject,
      text,
      html
    });

    await createAuditEntry({
      reservationId: reservation.id,
      action: "REMINDER_SENT",
      actorName: "System",
      actorEmail: "system@internal.local",
      actorRole: "ADMIN",
      notes: `Upcoming admin reminder email sent to ${reminder.recipientEmails.join(", ")} within ${data.adminReminderConfig.hours}h window.`,
      snapshot: reservation
    });

    sentCount += 1;
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      sentCount,
      skippedCount,
      totalQueued: data.upcomingAdminReminders.length,
      recipientEmails: data.adminReminderConfig.recipientEmails
    }
  };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runUpcomingReminderDispatch();
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST() {
  const result = await runUpcomingReminderDispatch();
  return NextResponse.json(result.body, { status: result.status });
}
