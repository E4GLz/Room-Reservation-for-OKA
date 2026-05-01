import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getSessionCookieOptions } from "@/lib/session";
import { findUserByEmailInsensitive, normalizeEmail } from "@/lib/user-identity";
import { serializeUser } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const matchedUser = await findUserByEmailInsensitive(parsed.data.email);

  const user = matchedUser
    ? await prisma.user.findUnique({
        where: { email: normalizeEmail(matchedUser.email) },
        include: {
          manager: true
        }
      }).catch(async () =>
        prisma.user.findUnique({
          where: { id: matchedUser.id },
          include: {
            manager: true
          }
        })
      )
    : null;

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Your account is waiting for admin approval. Please contact the administrator if you need access urgently." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    user: serializeUser(user)
  });
  const token = createSessionToken(user.id, parsed.data.remember);
  const sessionCookie = getSessionCookieOptions(parsed.data.remember);
  response.cookies.set({
    ...sessionCookie,
    value: token
  });

  return response;
}
