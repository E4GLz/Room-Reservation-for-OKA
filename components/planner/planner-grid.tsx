import { format } from "date-fns";
import { ReservationCard } from "@/components/planner/reservation-card";
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
  const grouped = groupReservationsByDateAndRoom(
    reservations,
    dates,
    rooms.map((room) => room.id)
  );

  return (
    <div className="overflow-auto rounded-[28px] border border-[var(--line)] bg-white/90">
      <table className="min-w-[1100px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-[#233241] text-white">
          <tr>
            <th className="w-44 border-b border-slate-800 px-4 py-4 text-xs uppercase tracking-[0.18em] text-slate-300">
              Date
            </th>
            {rooms.map((room) => (
              <th key={room.id} className="min-w-64 border-b border-slate-800 px-4 py-4">
                <div className="text-sm font-semibold">{room.name}</div>
                <div className="text-xs text-slate-300">
                  {room.code} | {room.location}
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
              <tr key={toDateKey(date)} className="align-top">
                <td
                  className={cn(
                    "border-b border-r border-slate-200 px-4 py-4",
                    today && "bg-brand-50",
                    (weekend || holiday) && "bg-sand"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{format(date, "EEE")}</div>
                      <div className="text-2xl font-semibold tracking-tight text-slate-950">{format(date, "dd")}</div>
                    </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                        {format(date, "MMM yyyy")}
                        {today ? <div className="mt-1 text-brand-700">Today</div> : null}
                      {holiday ? <div className="mt-1 text-amber-700">{blockedDay?.label || "Blocked"}</div> : null}
                      {weekend ? <div className="mt-1 text-slate-500">Weekend</div> : null}
                    </div>
                  </div>
                </td>
                {rooms.map((room) => {
                  const items = grouped.get(`${toDateKey(date)}:${room.id}`) ?? [];
                  return (
                    <td
                      key={`${room.id}-${toDateKey(date)}`}
                      className={cn(
                        "border-b border-r border-slate-200 px-3 py-3",
                        (weekend || holiday) && "bg-slate-50/90"
                      )}
                    >
                      <div className="flex min-h-24 flex-col gap-2">
                        {items.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400">
                            No bookings
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
