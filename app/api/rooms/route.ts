import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomSchema } from "@/lib/validation";
import { Room } from "@prisma/client";

export async function GET() {
  const rooms = await prisma.room.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
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
    },
  });

  return NextResponse.json(room, { status: 201 });
}
