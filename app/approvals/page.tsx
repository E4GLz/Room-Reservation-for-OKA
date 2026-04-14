import { ApprovalsPage as ApprovalsContent } from "@/components/approvals/approvals-page";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthenticatedPageUser } from "@/lib/server-auth";

export default async function ApprovalsPage() {
  const user = await requireAuthenticatedPageUser();

  return (
    <>
      <PageHeader
        eyebrow="Approvals"
        title={user.role === "ADMIN" ? "Admin Approval Queue" : "Approval Requests"}
        description={
          user.role === "ADMIN"
            ? "Review booking requests that are ready for admin approval."
            : "Review booking requests that are waiting for manager approval before they move to the admin team."
        }
      />
      <ApprovalsContent />
    </>
  );
}
