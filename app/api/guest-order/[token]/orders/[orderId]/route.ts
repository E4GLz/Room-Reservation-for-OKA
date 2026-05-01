import { Prisma, DrinkOrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findDrinkOrderForGuestTracking } from "@/lib/hospitality";

export async function GET(_: Request, { params }: { params: Promise<{ token: string; orderId: string }> }) {
  const { token, orderId } = await params;
  const order = await findDrinkOrderForGuestTracking(token, orderId);

  if (!order) {
    return NextResponse.json({ error: "This drink order could not be found." }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function POST(_: Request, { params }: { params: Promise<{ token: string; orderId: string }> }) {
  const { token, orderId } = await params;
  const order = await findDrinkOrderForGuestTracking(token, orderId);

  if (!order) {
    return NextResponse.json({ error: "This drink order could not be found." }, { status: 404 });
  }

  if (order.status === DrinkOrderStatus.SERVED || order.status === DrinkOrderStatus.CANCELLED) {
    return NextResponse.json({ error: "This order is already closed." }, { status: 400 });
  }

  const reminderTimestamp = order.guestReminderRequestedAt ? new Date(order.guestReminderRequestedAt) : null;
  const canSendReminder = !reminderTimestamp || Date.now() - reminderTimestamp.getTime() >= 3 * 60_000;

  if (!canSendReminder) {
    return NextResponse.json({ error: "A reminder was already sent recently." }, { status: 429 });
  }

  await prisma.$executeRaw(
    Prisma.sql`UPDATE "DrinkOrder" SET "guestReminderRequestedAt" = ${new Date()} WHERE "id" = ${orderId}`
  );

  const updated = await findDrinkOrderForGuestTracking(token, orderId);

  if (!updated) {
    return NextResponse.json({ error: "This drink order could not be found." }, { status: 404 });
  }

  return NextResponse.json({
    order: updated,
    message: "Reminder sent."
  });
}
