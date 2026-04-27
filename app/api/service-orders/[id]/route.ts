import { NextResponse } from "next/server";
import { DrinkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeDrinkOrder } from "@/lib/hospitality";
import { requireApiRole } from "@/lib/server-auth";
import { drinkOrderStatusSchema } from "@/lib/validation";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "SERVICE");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = drinkOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const status = parsed.data.status;
  const order = await prisma.drinkOrder.update({
    where: { id },
    data: {
      status,
      preparingAt: status === DrinkOrderStatus.PREPARING ? new Date() : undefined,
      servedAt: status === DrinkOrderStatus.SERVED ? new Date() : status === DrinkOrderStatus.CANCELLED ? null : undefined
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

  return NextResponse.json({ order: serializeDrinkOrder(order) });
}
