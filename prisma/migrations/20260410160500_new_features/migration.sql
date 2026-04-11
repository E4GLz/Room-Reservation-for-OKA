-- CreateEnum
CREATE TYPE "ManagerApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "siteTitleArabic" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "managerApprovalStatus" "ManagerApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN     "managerReviewerEmail" TEXT,
ADD COLUMN     "managerReviewerName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_managerId_managerApprovalStatus_bookingStatus_idx" ON "Reservation"("managerId", "managerApprovalStatus", "bookingStatus");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
