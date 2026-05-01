import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboardData } from "@/lib/dashboard";
import { requireAuthenticatedPageUser } from "@/lib/server-auth";

export default async function Dashboard() {
  const user = await requireAuthenticatedPageUser();
  const data = await getDashboardData(user);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Monitor current booking activity, approvals, utilization, and near-term room operations across the building."
      />
      <DashboardPage data={data} />
    </>
  );
}
