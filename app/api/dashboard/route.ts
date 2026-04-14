import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { requireApiUser } from "@/lib/server-auth";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth.response;
  }

  const data = await getDashboardData(auth.user);
  return NextResponse.json(data);
}
