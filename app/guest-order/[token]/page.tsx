import { notFound } from "next/navigation";
import { GuestOrderPage } from "@/components/hospitality/guest-order-page";
import { findActiveReservationForRoom, findRoomByServiceToken, listVisibleMenuItems } from "@/lib/hospitality";

export const dynamic = "force-dynamic";

export default async function GuestOrderTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const serviceToken = await findRoomByServiceToken(token);

  if (!serviceToken || !serviceToken.isEnabled) {
    notFound();
  }

  const room = serviceToken.room as typeof serviceToken.room & { seatLayoutConfig?: string | null };

  const [reservation, menuItems] = await Promise.all([
    findActiveReservationForRoom(serviceToken.roomId),
    listVisibleMenuItems()
  ]);

  return (
    <GuestOrderPage
      token={token}
      room={{
        id: room.id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        seatLayoutConfig: room.seatLayoutConfig ?? null
      }}
      reservation={
        reservation
          ? {
              id: reservation.id,
              meetingTitle: reservation.guestCompany || reservation.bookingCompany,
              startTime: reservation.startTime,
              endTime: reservation.endTime
            }
          : null
      }
      menuItems={menuItems}
    />
  );
}
