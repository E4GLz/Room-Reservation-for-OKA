import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME } from "@/lib/session-config";
const SESSION_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_DEFAULT_MAX_AGE = 60 * 60 * 12;

type SessionPayload = {
  sub: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || "";

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "development-session-secret-change-me";
  }

  throw new Error("SESSION_SECRET or AUTH_SECRET must be set in production.");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAge(remember?: boolean) {
  return remember ? SESSION_REMEMBER_MAX_AGE : SESSION_DEFAULT_MAX_AGE;
}

export function createSessionToken(userId: string, remember?: boolean) {
  const maxAge = getSessionMaxAge(remember);
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + maxAge
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
    if (!payload.sub || typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(remember?: boolean) {
  const maxAge = getSessionMaxAge(remember);
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge
    }
  };
}

export function getClearedSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    }
  };
}
