import { NextResponse } from "next/server";
import { ensureDefaultAdmin, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await ensureDefaultAdmin();

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (!user || user.status !== "ACTIVE" || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  return NextResponse.json({
    user: serializeUser(user)
  });
}
