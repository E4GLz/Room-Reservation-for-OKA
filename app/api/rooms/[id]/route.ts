import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
import { roomSchema } from "@/lib/validation";
export const dynamic = 'force-dynamic';

function getRoomErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return "A room with the same code or name already exists.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  ) {
    return "Room not found.";
  }

  return error instanceof Error ? error.message : "Unable to save room.";
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = roomSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...parsed.data,
        notes: parsed.data.notes || null,
        seatLayoutConfig: parsed.data.seatLayoutConfig || null
      } as never
    });

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: getRoomErrorMessage(error) }, { status: 500 });
  }
}
