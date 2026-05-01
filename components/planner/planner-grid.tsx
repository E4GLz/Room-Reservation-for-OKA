"use client";

import { ReservationCard } from "@/components/planner/reservation-card";
import { useLanguage } from "@/components/providers/language-provider";
import { cn, groupReservationsByDateAndRoom, isBlockedDay, isCurrentDay, isWeekend, toDateKey } from "@/lib/utils";
import type { AppSettingsRecord, ReservationRecord, RoomRecord } from "@/lib/types";

export function PlannerGrid({
  dates,
  rooms,
  reservations,
  settings
}: {
  dates: Date[];
  rooms: RoomRecord[];
  reservations: ReservationRecord[];
  settings: AppSettingsRecord;
}) {
  const { t, language } = useLanguage();
  const grouped = groupReservationsByDateAndRoom(
    reservations,
    dates,
    rooms.map((room) => room.id)
  );
  const roomColumnWidth = rooms.length > 0 ? `${(100 / rooms.length).toFixed(2)}%` : "auto";

  return (
    <div className="planner-grid-shell overflow-x-hidden overflow-y-auto rounded-[28px] border border-[var(--line)] bg-[var(--panel-elevated)]">
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-36" />
          {rooms.map((room) => (
            <col key={room.id} style={{ width: roomColumnWidth }} />
          ))}
        </colgroup>
        <thead className="planner-grid-head sticky top-0 z-10 text-white">
          <tr>
            <th className="border-b border-white/10 px-3 py-4 text-xs uppercase tracking-[0.18em] text-white/72">
              {t("Date")}
            </th>
            {rooms.map((room) => (
              <th key={room.id} className="border-b border-white/10 px-2 py-3 align-top">
                <div className="text-sm font-semibold leading-5 text-white">{room.name}</div>
                <div className="mt-1 break-words text-[11px] leading-4 text-white/68">
                  {room.code}
                  <span className="mx-1">|</span>
                  {room.location}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const weekend = isWeekend(date, settings);
            const holiday = isBlockedDay(date, settings.blockedDays);
            const blockedDay = settings.blockedDays.find((day) => String(day.date).slice(0, 10) === toDateKey(date));
            const today = isCurrentDay(date);

            return (
              <tr
                key={toDateKey(date)}
                id={`planner-date-${toDateKey(date)}`}
                className={cn(
                  "align-top",
                  today && "bg-[rgba(37,87,229,0.07)] ring-1 ring-inset ring-[rgba(37,87,229,0.28)]"
                )}
              >
                <td
                  className={cn(
                    "border-b border-r border-[var(--line)] px-3 py-4",
                    today && "planner-grid-today-side",
                    (weekend || holiday) && !today && "planner-grid-muted-side"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[var(--ink)]">
                        {new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { weekday: "short" }).format(date)}
                      </div>
                      <div className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
                        {new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { day: "2-digit" }).format(date)}
                      </div>
                    </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                        {new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", { month: "short", year: "numeric" }).format(date)}
                        {today ? <div className="mt-1 text-brand-700">{t("Today")}</div> : null}
                      {holiday ? <div className="mt-1 text-amber-700">{blockedDay?.label || t("Blocked")}</div> : null}
                      {weekend ? <div className="mt-1 text-[var(--muted)]">{t("Weekend")}</div> : null}
                    </div>
                  </div>
                </td>
                {rooms.map((room) => {
                  const items = grouped.get(`${toDateKey(date)}:${room.id}`) ?? [];
                  return (
                    <td
                      key={`${room.id}-${toDateKey(date)}`}
                      className={cn(
                        "border-b border-r border-[var(--line)] px-2 py-2.5",
                        today && "planner-grid-today-cell",
                        (weekend || holiday) && !today && "planner-grid-muted-cell"
                      )}
                    >
                      <div className="flex min-h-24 flex-col gap-1.5">
                        {items.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-soft)] px-2 py-5 text-center text-[11px] text-[var(--muted)]">
                            {t("No bookings")}
                          </div>
                        ) : (
                          items.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} compact />)
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
