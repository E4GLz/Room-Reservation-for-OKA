import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUniqueUserIdentity } from "@/lib/user-identity";
import { serializeUser } from "@/lib/utils";
import { userSchema } from "@/lib/validation";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      manager: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(serializeUser(user));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = userSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const uniqueness = await validateUniqueUserIdentity({
    email: parsed.data.email,
    phoneNumber: parsed.data.phoneNumber,
    excludeUserId: id
  });

  if (!uniqueness.ok) {
    return NextResponse.json({ error: { formErrors: [uniqueness.message] } }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: uniqueness.email,
      phoneNumber: uniqueness.phoneNumber,
      managerId: parsed.data.role === "ADMIN" ? null : parsed.data.managerId || null,
      role: parsed.data.role,
      status: parsed.data.status,
      ...(parsed.data.password ? { passwordHash: hashPassword(parsed.data.password) } : {})
    }
  });

  return NextResponse.json(serializeUser(user));
}
