import { PageHeader } from "@/components/ui/page-header";
import { HospitalityAdminPage } from "@/components/hospitality/hospitality-admin-page";
import { ensureRoomServiceToken, listCurrentDrinkOrders, listHospitalityMenuItems, listTodayServiceMeetings, serializeRoomServiceToken } from "@/lib/hospitality";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

async function getHospitalityData() {
  const rooms = await prisma.room.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ code: "asc" }]
  });

  const roomTokens = await Promise.all(
    rooms.map(async (room) => {
      const token = await ensureRoomServiceToken(room.id);
      return serializeRoomServiceToken({
        ...token,
        room
      });
    })
  );

  const [menuItems, todayMeetings, currentOrders] = await Promise.all([listHospitalityMenuItems(), listTodayServiceMeetings(), listCurrentDrinkOrders()]);
  return { rooms: roomTokens, menuItems, todayMeetings, currentOrders };
}

export default async function HospitalityPage() {
  await requirePageRole("ADMIN", "SERVICE");
  const data = await getHospitalityData();

  return (
    <>
      <PageHeader
        eyebrow="Hospitality"
        title="Guest service setup"
        description="Manage the fixed room QR links, beverage menu, stock availability, and the guest ordering experience."
      />
      <HospitalityAdminPage
        roomTokens={data.rooms}
        initialMenuItems={data.menuItems}
        todayMeetings={data.todayMeetings}
        initialCurrentOrders={data.currentOrders}
      />
    </>
  );
}
