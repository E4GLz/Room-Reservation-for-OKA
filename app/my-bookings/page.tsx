import { MyBookingsPage } from "@/components/bookings/my-bookings-page";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthenticatedPageUser } from "@/lib/server-auth";

export default async function MyBookings() {
  await requireAuthenticatedPageUser();
  return (
    <>
      <PageHeader
        eyebrow="My Workspace"
        title="My Bookings"
        description="Review your booking history, current reservation statuses, and upcoming schedule under your account."
      />
      <MyBookingsPage />
    </>
  );
}
