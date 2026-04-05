import { BookingForm } from "@/components/bookings/booking-form";
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
        description="Enter meeting details and reserve a room with server-side conflict validation."
      />
      <div className="px-8 py-6">
        <BookingForm rooms={rooms} />
      </div>
    </>
  );
}
