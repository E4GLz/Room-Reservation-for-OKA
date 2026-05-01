import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/server-auth";
import { findConflictingReservations, serializeReservation } from "@/lib/reservations";

export async function GET(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  const reservationDate = searchParams.get("reservationDate") || "";
  const reservationEndDate = searchParams.get("reservationEndDate") || reservationDate;
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");
  const excludeId = searchParams.get("excludeId") || undefined;

  if (!roomId || !reservationDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required query parameters." }, { status: 400 });
  }

  const conflicts = await findConflictingReservations({
    roomId,
    reservationDate,
    reservationEndDate,
    startTime,
    endTime,
    excludeId
  });

  return NextResponse.json({
    hasConflict: conflicts.length > 0,
    conflicts: conflicts.map(serializeReservation)
  });
}
