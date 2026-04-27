import { PageHeader } from "@/components/ui/page-header";
import { ServiceDashboardPage } from "@/components/hospitality/service-dashboard-page";
import { requirePageRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const user = await requirePageRole("ADMIN", "SERVICE");

  return (
    <>
      <PageHeader
        eyebrow="Hospitality"
        title="Service dashboard"
        description="Live room beverage orders and today's meetings for the service tablet. New requests appear automatically."
      />
      <ServiceDashboardPage initialRole={user.role} />
    </>
  );
}
