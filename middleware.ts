import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-config";

const PUBLIC_PATHS = ["/", "/login", "/register", "/agenda", "/guest-order"];
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/session", "/api/auth/logout"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname) || pathname === "/api/notifications/upcoming-reminders") {
      return NextResponse.next();
    }

    if (!hasSession) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
