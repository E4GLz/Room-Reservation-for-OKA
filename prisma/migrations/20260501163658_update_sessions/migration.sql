-- CreateEnum
CREATE TYPE "DrinkOrderStatus" AS ENUM ('NEW', 'PREPARING', 'SERVED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'SERVICE';

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomServiceToken" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomServiceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameArabic" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "descriptionArabic" TEXT,
    "imageAttachment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomNote" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemModifier" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelArabic" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrinkOrder" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "roomId" TEXT NOT NULL,
    "roomServiceTokenId" TEXT,
    "menuItemId" TEXT NOT NULL,
    "guestLabel" TEXT,
    "itemNameSnapshot" TEXT NOT NULL,
    "modifierSummary" TEXT,
    "customNote" TEXT,
    "status" "DrinkOrderStatus" NOT NULL DEFAULT 'NEW',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparingAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "guestReminderRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrinkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomServiceToken_roomId_key" ON "RoomServiceToken"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomServiceToken_token_key" ON "RoomServiceToken"("token");

-- CreateIndex
CREATE INDEX "MenuItem_category_sortOrder_idx" ON "MenuItem"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "MenuItemModifier_menuItemId_sortOrder_idx" ON "MenuItemModifier"("menuItemId", "sortOrder");

-- CreateIndex
CREATE INDEX "DrinkOrder_roomId_submittedAt_idx" ON "DrinkOrder"("roomId", "submittedAt");

-- CreateIndex
CREATE INDEX "DrinkOrder_reservationId_status_idx" ON "DrinkOrder"("reservationId", "status");

-- CreateIndex
CREATE INDEX "DrinkOrder_status_submittedAt_idx" ON "DrinkOrder"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "RoomServiceToken" ADD CONSTRAINT "RoomServiceToken_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifier" ADD CONSTRAINT "MenuItemModifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkOrder" ADD CONSTRAINT "DrinkOrder_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkOrder" ADD CONSTRAINT "DrinkOrder_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkOrder" ADD CONSTRAINT "DrinkOrder_roomServiceTokenId_fkey" FOREIGN KEY ("roomServiceTokenId") REFERENCES "RoomServiceToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkOrder" ADD CONSTRAINT "DrinkOrder_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
