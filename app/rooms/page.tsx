import { PageHeader } from "@/components/ui/page-header";
import { RoomsPage } from "@/components/rooms/rooms-page";
import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

async function getRooms() {
  return prisma.room.findMany({
    orderBy: [{ status: "asc" }, { code: "asc" }]
  });
}

export default async function Rooms() {
  const rooms = await getRooms();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Rooms Management"
        description="Maintain the official room master list, capacities, locations, and active availability for booking operations."
      />
      <RoomsPage rooms={rooms} />
    </>
  );
}
