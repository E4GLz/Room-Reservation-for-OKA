import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findActiveReservationForRoom, findRoomByServiceToken, listVisibleMenuItems, serializeDrinkOrder } from "@/lib/hospitality";
import { guestDrinkOrderSchema } from "@/lib/validation";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const serviceToken = await findRoomByServiceToken(token);

  if (!serviceToken || !serviceToken.isEnabled) {
    return NextResponse.json({ error: "This room ordering page is unavailable." }, { status: 404 });
  }

  const activeReservation = await findActiveReservationForRoom(serviceToken.roomId);

  return NextResponse.json({
    room: {
      id: serviceToken.room.id,
      name: serviceToken.room.name,
      location: serviceToken.room.location
    },
    reservation: activeReservation
      ? {
          id: activeReservation.id,
          meetingTitle: activeReservation.guestCompany || activeReservation.bookingCompany,
          startTime: activeReservation.startTime,
          endTime: activeReservation.endTime
        }
      : null,
    menuItems: await listVisibleMenuItems()
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const serviceToken = await findRoomByServiceToken(token);

  if (!serviceToken || !serviceToken.isEnabled) {
    return NextResponse.json({ error: "This room ordering page is unavailable." }, { status: 404 });
  }

  const activeReservation = await findActiveReservationForRoom(serviceToken.roomId);
  if (!activeReservation) {
    return NextResponse.json({ error: "Ordering is available only during an active reservation." }, { status: 400 });
  }

  const body = await request.json();
  const parsed = guestDrinkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedData = parsed.data as {
    guestLabel?: string;
    menuItemId?: string;
    selectedModifierIds?: string[];
    customNote?: string;
    items?: Array<{ menuItemId: string; selectedModifierIds: string[]; customNote?: string }>;
  };

  const items: Array<{ menuItemId: string; selectedModifierIds: string[]; customNote?: string }> = [];

  if (Array.isArray(normalizedData.items)) {
    items.push(...normalizedData.items);
  } else {
    items.push({
      menuItemId: normalizedData.menuItemId ?? "",
      selectedModifierIds: normalizedData.selectedModifierIds ?? [],
      customNote: normalizedData.customNote
    });
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: {
        in: items.map((item) => item.menuItemId)
      }
    },
    include: {
      modifiers: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
      }
    }
  });

  const menuItemMap = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);

    if (!menuItem || !menuItem.isActive || menuItem.isOutOfStock) {
      return NextResponse.json({ error: "Selected item is unavailable right now." }, { status: 400 });
    }
  }

  const createdOrders = await prisma.$transaction(
    items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const selectedModifiers = menuItem.modifiers.filter((modifier) => item.selectedModifierIds.includes(modifier.id));
      const modifierSummary = selectedModifiers.map((modifier) => modifier.label).join(", ");

      return prisma.drinkOrder.create({
        data: {
          reservationId: activeReservation.id,
          roomId: serviceToken.roomId,
          roomServiceTokenId: serviceToken.id,
          menuItemId: menuItem.id,
          guestLabel: normalizedData.guestLabel || null,
          itemNameSnapshot: menuItem.name,
          modifierSummary: modifierSummary || null,
          customNote: item.customNote || null
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
    })
  );

  const orders = createdOrders.map(serializeDrinkOrder);
  return NextResponse.json({ order: orders[0], orders }, { status: 201 });
}
