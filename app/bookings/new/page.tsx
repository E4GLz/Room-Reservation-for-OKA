import { CreateBookingPage } from "@/components/bookings/create-booking-page";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedPageUser } from "@/lib/server-auth";
export const dynamic = 'force-dynamic';

async function getRooms() {
  return prisma.room.findMany({
    where: { status: "ACTIVE" },
    orderBy: { code: "asc" }
  });
}

export default async function CreateBooking() {
  const user = await requireAuthenticatedPageUser();
  const rooms = await getRooms();

  return (
    <>
      <PageHeader
        eyebrow="Reservations"
        title={user.role === "ADMIN" ? "Create Booking" : "Request Booking"}
        description={
          user.role === "ADMIN"
            ? "Admin users can register new bookings with server-side conflict validation and room checks."
            : "Submit a room request for review with conflict validation and approval routing."
        }
      />
      <CreateBookingPage rooms={rooms} />
    </>
  );
}
