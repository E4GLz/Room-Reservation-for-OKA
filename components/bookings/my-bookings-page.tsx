"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, CalendarClock, CheckCheck, CircleOff, TimerReset } from "lucide-react";
import { BookingStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatePanel } from "@/components/ui/state-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { readErrorMessage } from "@/lib/client-errors";
import { formatLongDate, getManagerApprovalLabel, getManagerApprovalTone } from "@/lib/utils";
import type { ReservationRecord } from "@/lib/types";

export function MyBookingsPage() {
  const { t } = useLanguage();
  const { user, isReady } = useSession();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestSubmitted = searchParams.get("requestSubmitted") === "1";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    async function loadReservations() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/reservations?requesterEmail=${encodeURIComponent(user.email)}`);

        if (!response.ok) {
          setError(await readErrorMessage(response, t("Unable to load booking history.")));
          setLoading(false);
          return;
        }

        const payload = await response.json();
        setReservations(payload as ReservationRecord[]);
        setLoading(false);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t("Unable to load booking history."));
        setLoading(false);
      }
    }

    void loadReservations();
  }, [isReady, user]);

  const sortedReservations = useMemo(
    () =>
      [...reservations].sort(
        (a, b) =>
          new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime() ||
          b.startTime.localeCompare(a.startTime)
      ),
    [reservations]
  );
  const confirmedCount = sortedReservations.filter((reservation) => reservation.bookingStatus === BookingStatus.CONFIRMED).length;
  const pendingCount = sortedReservations.filter((reservation) => reservation.bookingStatus === BookingStatus.PENDING).length;
  const cancelledCount = sortedReservations.filter((reservation) => reservation.bookingStatus === BookingStatus.CANCELLED).length;
  const upcomingCount = sortedReservations.filter(
    (reservation) => reservation.bookingStatus !== BookingStatus.CANCELLED && new Date(reservation.reservationEndDate) >= new Date()
  ).length;

  if (isReady && !user) {
    return <StatePanel title={t("Sign in required")} message={t("Please sign in to review your booking history.")} />;
  }

  return (
    <div className="space-y-6 px-8 py-6">
      {requestSubmitted ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("Your booking request was submitted successfully.")}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard label={t("Your total bookings")} value={sortedReservations.length} icon={<CalendarClock className="h-5 w-5" />} tone="accent" />
        <KpiCard label={t("Confirmed")} value={confirmedCount} icon={<CheckCheck className="h-5 w-5" />} tone="soft" />
        <KpiCard label={t("Pending")} value={pendingCount} icon={<TimerReset className="h-5 w-5" />} tone="warning" />
        <KpiCard label={t("Cancelled")} value={cancelledCount} icon={<CircleOff className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{t("My booking history")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {upcomingCount} {t(upcomingCount === 1 ? "active booking is still upcoming." : "active bookings are still upcoming.")}
            </p>
          </div>
          <Link href="/planner">
            <Button variant="secondary">{t("Open schedule")}</Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <StatePanel title={t("Loading history")} message={t("Your booking history is being prepared.")} />
          ) : error ? (
            <StatePanel title={t("Unable to load history")} message={error} />
          ) : sortedReservations.length === 0 ? (
            <StatePanel title={t("No bookings yet")} message={t("Your booking history will appear here once an admin creates reservations under your account.")} />
          ) : (
            sortedReservations.map((reservation) => (
              <div key={reservation.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{reservation.guestCompany}</p>
                    <p className="mt-1 text-sm text-slate-600">{reservation.chargedDepartment}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={reservation.bookingStatus} />
                    {reservation.createdByRole === "STANDARD" && reservation.bookingStatus !== BookingStatus.CONFIRMED ? (
                      <Badge
                        label={getManagerApprovalLabel(reservation)}
                        tone={getManagerApprovalTone(reservation.managerApprovalStatus)}
                      />
                    ) : null}
                    <Link href={`/bookings/${reservation.id}`} className="text-slate-400 transition hover:text-slate-700">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <span>{reservation.room.name}</span>
                  <span>{formatLongDate(reservation.reservationDate)}</span>
                  <span>
                    {reservation.startTime} - {reservation.endTime}
                  </span>
                  <span>{t(reservation.reservationType)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
