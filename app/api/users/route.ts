import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/server-auth";
import { validateUniqueUserIdentity } from "@/lib/user-identity";
import { serializeUser } from "@/lib/utils";
import { userSchema } from "@/lib/validation";
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  const users = await prisma.user.findMany({
    include: {
      manager: true
    },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  return NextResponse.json(users.map((user) => serializeUser(user)));
}

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = userSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.password) {
    return NextResponse.json({ error: { formErrors: ["Password is required for new users."] } }, { status: 400 });
  }

  const uniqueness = await validateUniqueUserIdentity({
    email: parsed.data.email,
    phoneNumber: parsed.data.phoneNumber
  });

  if (!uniqueness.ok) {
    return NextResponse.json({ error: { formErrors: [uniqueness.message] } }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: uniqueness.email,
      phoneNumber: uniqueness.phoneNumber,
      managerId: parsed.data.role === "STANDARD" ? parsed.data.managerId || null : null,
      passwordHash: hashPassword(parsed.data.password),
      role: parsed.data.role as "ADMIN" | "MANAGER" | "STANDARD" | "SERVICE",
      status: parsed.data.status
    }
  });

  return NextResponse.json(serializeUser(user), { status: 201 });
}
