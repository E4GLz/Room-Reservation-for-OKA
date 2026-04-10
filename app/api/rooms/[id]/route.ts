import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roomSchema } from "@/lib/validation";
export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      notes: parsed.data.notes || null
    }
  });

  return NextResponse.json(room);
}
