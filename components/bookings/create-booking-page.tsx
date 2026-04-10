"use client";

import { BookingForm } from "@/components/bookings/booking-form";
import { StatePanel } from "@/components/ui/state-panel";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import type { RoomRecord } from "@/lib/types";

export function CreateBookingPage({ rooms }: { rooms: RoomRecord[] }) {
  const { t } = useLanguage();
  const { user, isReady } = useSession();

  if (!isReady) {
    return (
      <div className="px-8 py-6">
        <StatePanel title={t("Loading access")} message={t("Checking your booking permissions.")} />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="px-8 py-6">
        <StatePanel
          title={t("Admin booking only")}
          message={t("New bookings are managed from the admin side. Staff users can view the planner and review their booking history.")}
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
