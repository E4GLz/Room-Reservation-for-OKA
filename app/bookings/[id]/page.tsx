import { notFound } from "next/navigation";
import { BookingDetailPage } from "@/components/bookings/booking-detail-page";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { ReservationRecord } from "@/lib/types";
export const dynamic = 'force-dynamic';

async function getReservation(id: string) {
  const reservationRaw = await prisma.reservation.findUnique({
    where: { id },
    include: {
      room: true,
      auditEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  reservationRaw.room.createdAt;
  const reservation: ReservationRecord = {
    ...reservationRaw,
  };
  return reservation;
}

async function getRooms() {
  return prisma.room.findMany({
    orderBy: { code: "asc" },
  });
}

export default async function BookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [reservation, rooms] = await Promise.all([
    getReservation(id),
    getRooms(),
  ]);

  if (!reservation) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow="Reservation"
        title="Booking Detail"
        description="View the full reservation, audit history, and edit or cancel if permitted."
      />
      <BookingDetailPage reservation={reservation} rooms={rooms} />
    </>
  );
}
