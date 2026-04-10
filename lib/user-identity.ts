import { prisma } from "@/lib/prisma";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhoneNumber(phoneNumber: string | null | undefined) {
  if (!phoneNumber) {
    return null;
  }

  const normalized = phoneNumber.trim().replace(/[\s\-()]/g, "");
  return normalized || null;
}

export async function findUserByEmailInsensitive(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      managerId: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return users.find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
}

export async function validateUniqueUserIdentity(params: {
  email: string;
  phoneNumber?: string | null;
  excludeUserId?: string;
}) {
  const normalizedEmail = normalizeEmail(params.email);
  const normalizedPhoneNumber = normalizePhoneNumber(params.phoneNumber);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phoneNumber: true
    }
  });

  const conflictingEmail = users.find(
    (user) => user.id !== params.excludeUserId && normalizeEmail(user.email) === normalizedEmail
  );

  if (conflictingEmail) {
    return {
      ok: false as const,
      message: "A user with this email already exists."
    };
  }

  if (normalizedPhoneNumber) {
    const conflictingPhone = users.find(
      (user) =>
        user.id !== params.excludeUserId &&
        normalizePhoneNumber(user.phoneNumber) === normalizedPhoneNumber
    );

    if (conflictingPhone) {
      return {
        ok: false as const,
        message: "A user with this phone number already exists."
      };
    }
  }

  return {
    ok: true as const,
    email: normalizedEmail,
    phoneNumber: normalizedPhoneNumber
  };
}
