import { PlannerPage } from "@/components/planner/planner-page";
import { prisma } from "@/lib/prisma";
import { serializeReservation } from "@/lib/reservations";
import { getAppSettings } from "@/lib/settings";
import { serializeSettings, toDateKey } from "@/lib/utils";
import type { AppSettingsRecord, FilterState, PlannerView } from "@/lib/types";
import { BookingStatus } from "@prisma/client";
export const dynamic = 'force-dynamic';

async function getRooms() {
  const rooms = await prisma.room.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ code: "asc" }]
  });

  return rooms.map((room) => ({
    ...room,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString()
  }));
}

async function getReservations() {
  const reservations = await prisma.reservation.findMany({
    include: {
      room: true
    },
    orderBy: [{ reservationDate: "asc" }, { startTime: "asc" }]
  });

  return reservations.map((reservation) =>
    serializeReservation({
      ...reservation,
      auditEntries: []
    })
  );
}

async function getReservationHistorySummary() {
  const [earliestReservation, latestReservation, totalReservations] = await Promise.all([
    prisma.reservation.findFirst({
      orderBy: { reservationDate: "asc" },
      select: { reservationDate: true }
    }),
    prisma.reservation.findFirst({
      orderBy: { reservationDate: "desc" },
      select: { reservationDate: true }
    }),
    prisma.reservation.count()
  ]);

  return {
    totalReservations,
    earliestDate: earliestReservation ? toDateKey(earliestReservation.reservationDate) : null,
    latestDate: latestReservation ? toDateKey(latestReservation.reservationDate) : null
  };
}

export default async function Planner({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [rooms, reservations, settings, historySummary] = await Promise.all([
    getRooms(),
    getReservations(),
    getAppSettings(),
    getReservationHistorySummary()
  ]);
  const viewParam = Array.isArray(resolvedSearchParams.view) ? resolvedSearchParams.view[0] : resolvedSearchParams.view;
  const dateParam = Array.isArray(resolvedSearchParams.date) ? resolvedSearchParams.date[0] : resolvedSearchParams.date;
  const allowedViews: PlannerView[] = ["month", "week", "day", "list"];
  const initialView = allowedViews.includes(viewParam as PlannerView) ? (viewParam as PlannerView) : "month";
  const initialDate =
    typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : historySummary.latestDate ?? undefined;
const rawStatus = Array.isArray(resolvedSearchParams.status)
  ? resolvedSearchParams.status[0] ?? ""
  : resolvedSearchParams.status ?? "";

const initialFilters: FilterState = {
  roomId: Array.isArray(resolvedSearchParams.roomId) ? resolvedSearchParams.roomId[0] ?? "" : resolvedSearchParams.roomId ?? "",
  eventType: Array.isArray(resolvedSearchParams.eventType) ? resolvedSearchParams.eventType[0] ?? "" : resolvedSearchParams.eventType ?? "",
  status: (Object.values(BookingStatus).includes(rawStatus as BookingStatus) ? rawStatus : "") as "" | BookingStatus,
  search: Array.isArray(resolvedSearchParams.search) ? resolvedSearchParams.search[0] ?? "" : resolvedSearchParams.search ?? "",
};
const appSetting = serializeSettings(settings) as AppSettingsRecord;
  return (
    <PlannerPage
      rooms={rooms}
      reservations={reservations}
      settings={appSetting}
      initialView={initialView}
      initialDate={initialDate}
      initialFilters={initialFilters}
      historySummary={historySummary}
    />
  );
}
