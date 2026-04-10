"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus2, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { PlannerFilters } from "@/components/planner/planner-filters";
import { PlannerGrid } from "@/components/planner/planner-grid";
import { PlannerListView } from "@/components/planner/list-view";
import { Card } from "@/components/ui/card";
import {
  dateRangesOverlap,
  filterReservations,
  formatLongDate,
  formatMonthLabel,
  fromInputDate,
  getDateRangeForView,
  shiftDateByView,
  toDateKey,
  toInputDate
} from "@/lib/utils";
import type { AppSettingsRecord, FilterState, PlannerView, ReservationRecord, RoomRecord } from "@/lib/types";

const plannerViews: Array<{ value: PlannerView; label: string }> = [
  { value: "month", label: "Monthly view" },
  { value: "week", label: "Weekly view" },
  { value: "day", label: "Daily view" },
  { value: "list", label: "List view" }
];

export function PlannerPage({
  reservations,
  rooms,
  settings,
  initialView = "month",
  initialDate,
  initialFilters,
  historySummary
}: {
  reservations: ReservationRecord[];
  rooms: RoomRecord[];
  settings: AppSettingsRecord;
  initialView?: PlannerView;
  initialDate?: string;
  initialFilters?: FilterState;
  historySummary: {
    totalReservations: number;
    earliestDate: string | null;
    latestDate: string | null;
  };
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [view, setView] = useState<PlannerView>(initialView);
  const [baseDate, setBaseDate] = useState<Date>(initialDate ? fromInputDate(initialDate) : new Date());
  const [filters, setFilters] = useState<FilterState>(
    initialFilters ?? {
      roomId: "",
      eventType: "",
      status: "",
      search: ""
    }
  );

  const visibleDates = useMemo(
    () => getDateRangeForView(baseDate, view === "list" ? "month" : view, settings.workWeekStart, settings.workWeekEnd),
    [baseDate, settings.workWeekEnd, settings.workWeekStart, view]
  );
  const filteredReservations = useMemo(() => {
    const inRange = reservations.filter((reservation) => {
      const first = toDateKey(visibleDates[0]);
      const last = toDateKey(visibleDates[visibleDates.length - 1]);
      return dateRangesOverlap(reservation.reservationDate, reservation.reservationEndDate, first, last);
    });

    return filterReservations(inRange, filters);
  }, [filters, reservations, visibleDates]);

  const visibleRooms = useMemo(
    () => rooms.filter((room) => !filters.roomId || room.id === filters.roomId),
    [filters.roomId, rooms]
  );
  const showHistoryCard =
    historySummary.totalReservations > 0 &&
    historySummary.earliestDate &&
    historySummary.latestDate &&
    historySummary.earliestDate !== historySummary.latestDate;

  function jumpToDate(value: string | null) {
    if (!value) {
      return;
    }

    const nextDate = fromInputDate(value);
    setBaseDate(nextDate);
    router.replace(`/planner?date=${value}&view=${view}`);
  }

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Reservations"
        title="Planner"
        description="Use the planner to review room usage, manage daily reservations, and maintain a conflict-safe booking calendar."
        actions={
          <>
            <Link href="/bookings/new">
              <Button>
                <CalendarPlus2 className="mr-2 h-4 w-4" />
                {t("Create booking")}
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-6 px-8 py-6">
        {showHistoryCard ? (
          <Card className="bg-[linear-gradient(135deg,rgba(240,247,255,0.96),rgba(255,255,255,0.98))]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{t("Historical data available")}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{t("Imported reservations are in the planner")}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {t("This planner contains")} {historySummary.totalReservations.toLocaleString()} {t("reservations from")}{" "}
                  {formatLongDate(historySummary.earliestDate)} to {formatLongDate(historySummary.latestDate)}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => jumpToDate(historySummary.earliestDate)}>
                  {t("Jump to earliest booking")}
                </Button>
                <Button variant="ghost" onClick={() => jumpToDate(historySummary.latestDate)}>
                  {t("Return to latest booking")}
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(237,243,255,0.82))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" onClick={() => setBaseDate(shiftDateByView(baseDate, view === "list" ? "month" : view, "prev"))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-lg font-semibold text-slate-950">{formatMonthLabel(baseDate)}</p>
                <p className="text-sm text-slate-500">
                  {formatLongDate(visibleDates[0])}
                  {` ${t("to")} `}
                  {formatLongDate(visibleDates[visibleDates.length - 1])}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setBaseDate(shiftDateByView(baseDate, view === "list" ? "month" : view, "next"))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <input
                type="date"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                value={toInputDate(baseDate)}
                onChange={(event) => jumpToDate(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {plannerViews.map((item) => (
                <Button
                  key={item.value}
                  variant={item.value === view ? "primary" : "ghost"}
                  onClick={() => {
                    setView(item.value);
                    router.replace(`/planner?date=${toInputDate(baseDate)}&view=${item.value}`);
                  }}
                >
                  {t(item.label)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <PlannerFilters rooms={rooms} filters={filters} onChange={setFilters} />

        {view === "list" ? (
          <PlannerListView reservations={filteredReservations} />
        ) : (
          <PlannerGrid dates={visibleDates} rooms={visibleRooms} reservations={filteredReservations} settings={settings} />
        )}
      </div>
    </div>
  );
}
