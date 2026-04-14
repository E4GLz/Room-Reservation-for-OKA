import { NextResponse } from "next/server";
import { getClearedSessionCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getClearedSessionCookie());
  return response;
}
