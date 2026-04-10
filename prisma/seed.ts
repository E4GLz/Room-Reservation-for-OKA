import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

async function main() {
  const existingSettings = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });
  if (!existingSettings) {
    console.warn("App settings do not exist, creating default settings.");
    await prisma.appSettings.create({
      data: {
        id: "default",
        siteTitle: "Room Reservation Hub",
        siteDescription:
          "Internal platform for room bookings, approvals, and planning.",
        workWeekStart: 0,
        workWeekEnd: 4,
        upcomingReminderHours: 24,
      },
    });
  }

  if (!adminEmail || !adminPassword) {
    console.warn(
      "Admin email or password not set in environment variables. Skipping admin user creation."
    );
    return;
  }
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    console.warn("Admin user does not exist, creating default admin.");
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: "Admin User",
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        phoneNumber: null,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};
