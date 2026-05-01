import { BookingStatus } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { ReceptionAgendaPage } from "@/components/agenda/reception-agenda-page";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function isLegacyReservationSchemaError(error: unknown) {
  return error instanceof Error && error.message.includes("reservationEndDate");
}

async function getTodayAgenda() {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  try {
    return await prisma.reservation.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        reservationDate: {
          lte: dayEnd
        },
        reservationEndDate: {
          gte: dayStart
        }
      },
      include: {
        room: true
      },
      orderBy: [{ startTime: "asc" }, { room: { name: "asc" } }]
    });
  } catch (error) {
    if (!isLegacyReservationSchemaError(error)) {
      throw error;
    }

    return prisma.reservation.findMany({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        reservationDate: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        room: true
      },
      orderBy: [{ startTime: "asc" }, { room: { name: "asc" } }]
    });
  }
}

export default async function AgendaPage() {
  const [settings, reservations] = await Promise.all([getAppSettings(), getTodayAgenda()]);

  const items = reservations.map((reservation) => {
    const reservationRecord = reservation as typeof reservation & {
      guestCompany?: string | null;
    };

    return {
      id: reservation.id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      meetingTitle: reservationRecord.guestCompany ?? reservation.bookingCompany,
      roomName: reservation.room.name,
      roomLocation: reservation.room.location
    };
  });

  return <ReceptionAgendaPage siteTitle={settings.siteTitle} items={items} />;
}
