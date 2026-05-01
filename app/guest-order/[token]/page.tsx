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

  const [reservation, menuItems] = await Promise.all([
    findActiveReservationForRoom(serviceToken.roomId),
    listVisibleMenuItems()
  ]);

  return (
    <GuestOrderPage
      token={token}
      room={{
        id: serviceToken.room.id,
        name: serviceToken.room.name,
        location: serviceToken.room.location
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
