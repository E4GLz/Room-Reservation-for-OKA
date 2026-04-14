"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus2, ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
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
  initialFilters
}: {
  reservations: ReservationRecord[];
  rooms: RoomRecord[];
  settings: AppSettingsRecord;
  initialView?: PlannerView;
  initialDate?: string;
  initialFilters?: FilterState;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useSession();
  const [view, setView] = useState<PlannerView>(initialView);
  const [baseDate, setBaseDate] = useState<Date>(initialDate ? fromInputDate(initialDate) : new Date());
  const [scrollTargetDate, setScrollTargetDate] = useState<string | null>(null);
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
  useEffect(() => {
    if (!scrollTargetDate) {
      return;
    }

    const targetId = `planner-date-${scrollTargetDate}`;
    let frame = 0;

    const scrollToTarget = () => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setScrollTargetDate(null);
        return;
      }

      frame = window.requestAnimationFrame(scrollToTarget);
    };

    frame = window.requestAnimationFrame(scrollToTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [scrollTargetDate, view]);

  function jumpToDate(value: string | null) {
    if (!value) {
      return;
    }

    const nextDate = fromInputDate(value);
    setBaseDate(nextDate);
    setScrollTargetDate(value);
    router.replace(`/planner?date=${value}&view=${view}`);
  }

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow="Reservations"
        title="Planner"
        description="Use the planner to review room usage, manage daily reservations, and maintain a conflict-safe booking calendar."
        actions={
          user ? (
            <Link href="/bookings/new">
              <Button>
                <CalendarPlus2 className="mr-2 h-4 w-4" />
                {t(user.role === "ADMIN" ? "Create booking" : "Request booking")}
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="space-y-6 px-8 py-6">
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
              <Button variant="secondary" onClick={() => jumpToDate(toInputDate(new Date()))}>
                <Crosshair className="mr-2 h-4 w-4" />
                {t("Jump to today")}
              </Button>
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
