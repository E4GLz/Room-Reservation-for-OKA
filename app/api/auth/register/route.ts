import { NextResponse } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUniqueUserIdentity } from "@/lib/user-identity";
import { serializeUser } from "@/lib/utils";
import { z } from "zod";

const registerSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    phoneNumber: z.string().max(40).optional().or(z.literal("")),
    password: z.string().min(6).max(120),
    confirmPassword: z.string().min(6).max(120)
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });

function getRegisterErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return "An account with this email already exists.";
  }

  return error instanceof Error ? error.message : "Unable to register user.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
        passwordHash: hashPassword(parsed.data.password),
        role: UserRole.STANDARD,
        status: UserStatus.INACTIVE,
        managerId: null
      },
      include: {
        manager: true
      }
    });

    return NextResponse.json({
      user: serializeUser(user),
      message: "Your account request has been submitted and is waiting for admin approval."
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getRegisterErrorMessage(error) }, { status: 500 });
  }
}
