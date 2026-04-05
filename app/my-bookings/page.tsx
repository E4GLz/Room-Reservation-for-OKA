import { MyBookingsPage } from "@/components/bookings/my-bookings-page";
import { PageHeader } from "@/components/ui/page-header";

export default function MyBookings() {
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
