import { CreateBookingPage } from "@/components/bookings/create-booking-page";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";

async function getRooms() {
  return prisma.room.findMany({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" }
  });
}

export default async function CreateBooking() {
  const rooms = await getRooms();

  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title="Create Booking"
        description="Admin users can register new bookings with server-side conflict validation and room checks."
      />
      <CreateBookingPage rooms={rooms} />
    </>
  );
}
