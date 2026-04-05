import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboardData } from "@/lib/dashboard";

export default async function Dashboard() {
  const data = await getDashboardData();

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
