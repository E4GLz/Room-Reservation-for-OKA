"use client";

import { useSession } from "@/components/providers/session-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ReservationCard } from "@/components/planner/reservation-card";
import { StatePanel } from "@/components/ui/state-panel";
import { canUserViewReservationDetails, formatLongDate } from "@/lib/utils";
import type { ReservationRecord } from "@/lib/types";

export function PlannerListView({ reservations }: { reservations: ReservationRecord[] }) {
  const { user } = useSession();
  const { t } = useLanguage();

  if (reservations.length === 0) {
    return <StatePanel title={t("No bookings found")} message={t("Adjust the filters or create a new booking.")} />;
  }

  return (
    <div className="space-y-3">
      {reservations.map((reservation) => (
        <div key={reservation.id} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-elevated)] p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              {canUserViewReservationDetails(reservation, user) ? (
                <>
                  <p className="text-sm font-semibold text-[var(--ink)]">{reservation.guestCompany}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {reservation.room.name} | {reservation.chargedDepartment} | {formatLongDate(reservation.reservationDate)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--ink)]">{reservation.room.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {t("Blocked")} | {formatLongDate(reservation.reservationDate)}
                  </p>
                </>
              )}
            </div>
            <div className="w-full max-w-sm">
              <ReservationCard reservation={reservation} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
