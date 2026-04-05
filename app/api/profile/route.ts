import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/utils";
import { profileSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  const body = await request.json();
  const id = body.id as string | undefined;

  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id }
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (parsed.data.newPassword && !verifyPassword(parsed.data.currentPassword || "", existing.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phoneNumber: parsed.data.phoneNumber || null,
      ...(parsed.data.newPassword ? { passwordHash: hashPassword(parsed.data.newPassword) } : {})
    }
  });

  return NextResponse.json({
    user: serializeUser(updated)
  });
}
