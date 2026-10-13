-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "seatLayoutConfig" TEXT;

-- AlterTable
ALTER TABLE "DrinkOrder" ADD COLUMN     "seatKey" TEXT,
ADD COLUMN     "seatLabel" TEXT;
