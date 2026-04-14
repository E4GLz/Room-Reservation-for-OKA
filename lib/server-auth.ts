import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, getSessionCookieName } from "@/lib/session";
import { serializeUser } from "@/lib/utils";

async function getSessionUserRecord() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const payload = verifySessionToken(token);

  if (!payload?.sub) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { manager: true }
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

export async function getCurrentSessionUser() {
  const user = await getSessionUserRecord();
  return user ? serializeUser(user) : null;
}

export async function requireAuthenticatedPageUser() {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminPageUser() {
  const user = await requireAuthenticatedPageUser();

  if (user.role !== "ADMIN") {
    redirect("/planner");
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await getCurrentSessionUser();
  if (user) {
    redirect("/dashboard");
  }
}

export async function requireApiUser() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 })
    };
  }

  return { user, response: null };
}

export async function requireApiRole(...roles: UserRole[]) {
  const auth = await requireApiUser();
  if (auth.response || !auth.user) {
    return auth;
  }

  if (!roles.includes(auth.user.role)) {
    return {
      user: null,
      response: NextResponse.json({ error: "You do not have access to this action." }, { status: 403 })
    };
  }

  return auth;
}
