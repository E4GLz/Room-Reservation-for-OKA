import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservationAudit.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.room.deleteMany();
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteTitle: "Room Reservation Hub",
      siteDescription: "Internal platform for room bookings, approvals, and planning.",
      workWeekStart: 0,
      workWeekEnd: 4,
      upcomingReminderHours: 24
    }
  });
  await prisma.user.upsert({
    where: { email: "admin@company.internal" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@company.internal",
      passwordHash: hashPassword("Admin@123"),
      phoneNumber: null,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    }
  });
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
