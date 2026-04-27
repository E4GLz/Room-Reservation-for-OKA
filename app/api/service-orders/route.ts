import { NextResponse } from "next/server";
import { listCurrentDrinkOrders, listTodayServiceMeetings } from "@/lib/hospitality";
import { requireApiRole } from "@/lib/server-auth";

export async function GET() {
  const auth = await requireApiRole("ADMIN", "SERVICE");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const [orders, meetings] = await Promise.all([listCurrentDrinkOrders(), listTodayServiceMeetings()]);

  return NextResponse.json({ orders, meetings });
}
