import { NextResponse } from "next/server";
import { ensureRoomServiceToken, serializeRoomServiceToken } from "@/lib/hospitality";
import { requireApiRole } from "@/lib/server-auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const { id } = await params;
  const token = await ensureRoomServiceToken(id);
  return NextResponse.json(serializeRoomServiceToken(token));
}
