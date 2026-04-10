import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

const DEFAULT_ADMIN_EMAIL = "admin@company.internal";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");

  return derived.length === original.length && timingSafeEqual(derived, original);
}

export async function ensureDefaultAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL }
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      name: "Admin User",
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      phoneNumber: null,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
}

export const defaultAdminCredentials = {
  email: DEFAULT_ADMIN_EMAIL,
  password: DEFAULT_ADMIN_PASSWORD
};
