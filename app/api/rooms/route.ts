import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomSchema } from "@/lib/validation";

export async function GET() {
  const rooms = await prisma.room.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }]
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = roomSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const room = await prisma.room.create({
    data: {
      ...parsed.data,
      notes: parsed.data.notes || null
    }
  });

  return NextResponse.json(room, { status: 201 });
}
