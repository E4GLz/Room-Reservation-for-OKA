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

  return error instanceof Error ? error.message : "Unable to save room.";
}

export async function GET() {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  const rooms = await prisma.room.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const parsed = roomSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    code,
    name,
    type,
    capacity,
    location,
    seatLayoutConfig,
    status = "ACTIVE",
  } = parsed.data;

  const room = await prisma.room.create({
    data: {
      code: code!,
      name: name!,
      type: type!,
      capacity: capacity!,
      location: location!,
      status,
      notes: parsed.data.notes || null,
      seatLayoutConfig: seatLayoutConfig || null
    } as never,
  });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getRoomErrorMessage(error) }, { status: 500 });
  }
}
