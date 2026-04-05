"use client";

import { BookingForm } from "@/components/bookings/booking-form";
import { StatePanel } from "@/components/ui/state-panel";
import { useSession } from "@/components/providers/session-provider";
import type { RoomRecord } from "@/lib/types";

export function CreateBookingPage({ rooms }: { rooms: RoomRecord[] }) {
  const { user, isReady } = useSession();

  if (!isReady) {
    return (
      <div className="px-8 py-6">
        <StatePanel title="Loading access" message="Checking your booking permissions." />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="px-8 py-6">
        <StatePanel
          title="Admin booking only"
          message="New bookings are managed from the admin side. Staff users can view the planner and review their booking history."
        />
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <BookingForm rooms={rooms} />
    </div>
  );
}
