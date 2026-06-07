import { NextResponse } from "next/server";
import { listCurrentDrinkOrders, listTodayServiceMeetings } from "@/lib/hospitality";
import { requireApiRole } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireApiRole("ADMIN", "SERVICE");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const itemName = searchParams.get("itemName");
  const history = searchParams.get("history");

  if (itemName || history) {
    const orders = await prisma.drinkOrder.findMany({
      where: itemName ? { itemNameSnapshot: itemName } : {},
      include: {
        room: true,
        menuItem: { include: { modifiers: true } }
      },
      orderBy: { submittedAt: "desc" },
      take: 200
    });
    return NextResponse.json({ orders });
  }

  const [orders, meetings] = await Promise.all([
    listCurrentDrinkOrders(),
    listTodayServiceMeetings()
  ]);

  return NextResponse.json({ orders, meetings });
}
