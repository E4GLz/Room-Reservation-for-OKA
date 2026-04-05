import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/utils";
import { userSchema } from "@/lib/validation";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  return NextResponse.json(users.map((user) => serializeUser(user)));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = userSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.password) {
    return NextResponse.json({ error: { formErrors: ["Password is required for new users."] } }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phoneNumber: parsed.data.phoneNumber || null,
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role,
      status: parsed.data.status
    }
  });

  return NextResponse.json(serializeUser(user), { status: 201 });
}
