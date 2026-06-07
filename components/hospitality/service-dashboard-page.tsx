"use client";

import { useEffect, useMemo, useState } from "react";
import { DrinkOrderStatus, UserRole } from "@prisma/client";
import { CheckCircle2, Clock3 } from "lucide-react";
import { RoomSeatMap } from "@/components/hospitality/room-seat-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { readErrorMessage } from "@/lib/client-errors";
import { parseRoomLayout } from "@/lib/room-layout";
import type { DrinkOrderRecord } from "@/lib/types";

type TodayMeetingRecord = {
  id: string;
  startTime: string;
  endTime: string;
  meetingTitle: string;
  roomName: string;
  roomLocation: string;
  reservationDate: string;
  reservationEndDate: string;
};

export function ServiceDashboardPage({ initialRole }: { initialRole: UserRole }) {
  const { t } = useLanguage();
  const { user, isReady } = useSession();
  const [orders, setOrders] = useState<DrinkOrderRecord[]>([]);
  const [meetings, setMeetings] = useState<TodayMeetingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user || (user.role !== "SERVICE" && user.role !== "ADMIN")) {
      setLoading(false);
      return;
    }

    async function loadOrders() {
      try {
        const response = await fetch("/api/service-orders", { cache: "no-store" });
        if (!response.ok) {
          setError(await readErrorMessage(response, t("Unable to load service orders.")));
          setLoading(false);
          return;
        }

        const payload = (await response.json()) as {
          orders: DrinkOrderRecord[];
          meetings: TodayMeetingRecord[];
        };

        setOrders(payload.orders);
        setMeetings(payload.meetings);
        setLoading(false);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t("Unable to load service orders."));
        setLoading(false);
      }
    }

    void loadOrders();
    const interval = window.setInterval(() => {
      void loadOrders();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [isReady, t, user]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, DrinkOrderRecord[]>();
    for (const order of orders) {
      const key = order.room.name;
      groups.set(key, [...(groups.get(key) ?? []), order]);
    }
    return Array.from(groups.entries())
      .map(([roomName, roomOrders]) => [
        roomName,
        [...roomOrders].sort((left, right) => {
          const leftReminder = left.guestReminderRequestedAt ? 1 : 0;
          const rightReminder = right.guestReminderRequestedAt ? 1 : 0;
          if (leftReminder !== rightReminder) {
            return rightReminder - leftReminder;
          }
          return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
        })
      ] as const)
      .sort((left, right) => left[0].localeCompare(right[0]));
  }, [orders]);

  const groupedSeatOrders = useMemo(
    () =>
      groupedOrders.map(([roomName, roomOrders]) => {
        const seatGroups = new Map<string, DrinkOrderRecord[]>();

        for (const order of roomOrders) {
          const seatKey = order.seatKey ?? `unassigned-${order.id}`;
          seatGroups.set(seatKey, [...(seatGroups.get(seatKey) ?? []), order]);
        }

        const groupedSeats = Array.from(seatGroups.entries())
          .map(([seatKey, seatOrders]) => ({
            seatKey,
            seatLabel: seatOrders[0]?.seatLabel ?? t("Unassigned seat"),
            guestLabel: seatOrders[0]?.guestLabel ?? "",
            submittedAt: seatOrders[0]?.submittedAt ?? "",
            orders: seatOrders
          }))
          .sort((left, right) => new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime());

        return [roomName, groupedSeats, roomOrders] as const;
      }),
    [groupedOrders, t]
  );

  const serviceSummary = useMemo(() => {
    const servedOrders = orders.filter((order) => order.status === DrinkOrderStatus.SERVED && order.servedAt);
    const averageMinutes = servedOrders.length
      ? Math.round(
          servedOrders.reduce((total, order) => {
            const submitted = new Date(order.submittedAt).getTime();
            const served = new Date(order.servedAt ?? order.updatedAt).getTime();
            return total + Math.max(0, served - submitted);
          }, 0) /
            servedOrders.length /
            60000
        )
      : 0;

    return {
      totalOrders: orders.length,
      servedOrders: servedOrders.length,
      averageMinutes,
      reminderOrders: orders.filter((order) => order.guestReminderRequestedAt && order.status !== DrinkOrderStatus.SERVED).length
    };
  }, [orders]);

  async function updateStatus(id: string, status: DrinkOrderStatus) {
    setError("");
    setUpdatingOrderId(id);

    try {
      const response = await fetch(`/api/service-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, t("Unable to update service order.")));
        setUpdatingOrderId(null);
        return;
      }

      const payload = (await response.json()) as { order: DrinkOrderRecord };
      setOrders((current) => current.map((order) => (order.id === id ? payload.order : order)));
      setUpdatingOrderId(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t("Unable to update service order."));
      setUpdatingOrderId(null);
    }
  }

  if (isReady && (!user || (initialRole !== "SERVICE" && initialRole !== "ADMIN"))) {
    return <StatePanel title={t("Service access required")} message={t("Only service and admin accounts can open the live beverage order dashboard.")} />;
  }

  return (
    <div className="space-y-6 px-8 py-6">
      {error ? <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {loading ? (
        <StatePanel title={t("Loading service orders")} message={t("Checking the latest guest beverage requests across the rooms.")} />
      ) : groupedOrders.length === 0 && meetings.length === 0 ? (
        <StatePanel
          title={t("No live drink orders")}
          message={t("Today's room orders and meetings will appear here automatically as guests submit requests and reservations begin.")}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Today's orders")}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{serviceSummary.totalOrders}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Served today")}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{serviceSummary.servedOrders}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Average delivery time")}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {serviceSummary.averageMinutes} {t("mins")}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("Reminder requests")}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{serviceSummary.reminderOrders}</p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{t("Today's meetings")}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t("Use this list to prepare rooms and stay ahead of guest service needs.")}</p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)] ring-1 ring-[var(--line)]">
                  {meetings.length} {t("meetings")}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {meetings.length ? (
                  meetings.map((meeting) => {
                    const status = getMeetingTimingStatus(meeting);
                    return (
                      <div key={meeting.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{meeting.meetingTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">{meeting.roomName}</p>
                            <p className="mt-1 text-sm text-slate-500">{meeting.roomLocation}</p>
                          </div>
                          <div className="space-y-2 text-right">
                            <MeetingStatusBadge status={status} t={t} />
                            <div className="text-sm font-medium text-slate-700">
                              <p>{meeting.startTime}</p>
                              <p className="text-slate-500">{meeting.endTime}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-slate-50 p-6 text-sm text-slate-500">
                    {t("No meetings scheduled today")}
                  </div>
                )}
              </div>
            </Card>

            {groupedSeatOrders.map(([roomName, seatGroups, roomOrders]) => (
              <Card key={roomName}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">{roomName}</h3>
                    <p className="mt-1 text-sm text-slate-500">{roomOrders[0]?.room.location}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">
                      {roomOrders.filter((order) => order.status === DrinkOrderStatus.NEW).length} {t("new")}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-200">
                      {roomOrders.filter((order) => order.status === DrinkOrderStatus.PREPARING).length} {t("preparing")}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                      {roomOrders.filter((order) => order.status === DrinkOrderStatus.SERVED).length} {t("served")}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <RoomServiceMap roomOrders={roomOrders} t={t} />
                </div>
                <div className="mt-4 space-y-3">
                  {seatGroups.map((seatGroup) => (
                    <div key={seatGroup.seatKey} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              {new Date(seatGroup.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                            <span>{roomName}</span>
                            <span>{t("Seat")} {seatGroup.seatLabel}</span>
                            {seatGroup.orders.some((order) => order.guestReminderRequestedAt) ? <ReminderBadge t={t} /> : null}
                          </div>
                          {seatGroup.guestLabel ? <p className="text-sm font-medium text-slate-700">{seatGroup.guestLabel}</p> : null}
                          <p className="text-sm font-medium text-slate-600">
                            {t("Elapsed time")}: {formatElapsedTime(seatGroup.orders[0]!, now)}
                          </p>
                          <div className="space-y-2">
                            {seatGroup.orders.map((order) => (
                              <div key={order.id} className="rounded-[16px] bg-white px-3 py-3 ring-1 ring-[var(--line)]">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">{formatOrderSummary(order)}</p>
                                    {order.status === DrinkOrderStatus.SERVED && order.servedAt ? (
                                      <p className="mt-1 text-xs text-emerald-700">
                                        {t("Served at")}{" "}
                                        {new Date(order.servedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                      </p>
                                    ) : null}
                                  </div>
                                  <StatusBadge status={order.status} t={t} />
                                </div>
                                {order.status !== DrinkOrderStatus.SERVED ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      variant="secondary"
                                      disabled={order.status === DrinkOrderStatus.PREPARING || updatingOrderId === order.id}
                                      onClick={() => void updateStatus(order.id, DrinkOrderStatus.PREPARING)}
                                    >
                                      {t("Preparing")}
                                    </Button>
                                    <Button disabled={updatingOrderId === order.id} onClick={() => void updateStatus(order.id, DrinkOrderStatus.SERVED)}>
                                      {updatingOrderId === order.id ? t("Saving...") : t("Served")}
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600 ring-1 ring-[var(--line)]">
                          {seatGroup.orders.length} {t("drinks")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomServiceMap({
  roomOrders,
  t
}: {
  roomOrders: DrinkOrderRecord[];
  t: (text: string) => string;
}) {
  const room = roomOrders[0]?.room;
  const layout = parseRoomLayout(room?.seatLayoutConfig, room?.capacity ?? 8);
  const highlightedSeatKeys = roomOrders
    .filter((order) => order.seatKey)
    .map((order) => order.seatKey as string);
  const seatAnnotations = Object.fromEntries(
    roomOrders
      .filter((order) => order.seatKey)
      .map((order) => [
        order.seatKey as string,
        order.guestLabel?.trim() || `${t("Seat")} ${order.seatLabel ?? ""}`.trim()
      ])
  );

  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{t("Seat map")}</p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 ring-1 ring-[var(--line)]">
          {highlightedSeatKeys.length} {t("active seats")}
        </span>
      </div>
      <RoomSeatMap layout={layout} mode="preview" highlightedSeatKeys={highlightedSeatKeys} seatAnnotations={seatAnnotations} className="p-3" />
    </div>
  );
}

function formatOrderSummary(order: DrinkOrderRecord) {
  const parts = [order.itemNameSnapshot];

  if (order.modifierSummary) {
    parts.push(order.modifierSummary);
  }

  if (order.customNote) {
    parts.push(order.customNote);
  }

  return parts.join(" - ");
}

function getMeetingTimingStatus(meeting: TodayMeetingRecord) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinutes(meeting.startTime);
  const endMinutes = toMinutes(meeting.endTime);

  if (currentMinutes < startMinutes) {
    return "upcoming" as const;
  }

  if (currentMinutes > endMinutes) {
    return "finished" as const;
  }

  return "current" as const;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function MeetingStatusBadge({
  status,
  t
}: {
  status: "upcoming" | "current" | "finished";
  t: (text: string) => string;
}) {
  if (status === "current") {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">{t("Current")}</span>;
  }

  if (status === "finished") {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">{t("Finished")}</span>;
  }

  return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">{t("Upcoming")}</span>;
}

function StatusBadge({ status, t }: { status: DrinkOrderStatus; t: (text: string) => string }) {
  if (status === DrinkOrderStatus.SERVED) {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">{t("Served")}</span>;
  }

  if (status === DrinkOrderStatus.PREPARING) {
    return <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-200">{t("Preparing")}</span>;
  }

  return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">{t("New")}</span>;
}

function ReminderBadge({ t }: { t: (text: string) => string }) {
  return <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700 ring-1 ring-rose-200">{t("Reminder received")}</span>;
}

function formatElapsedTime(order: DrinkOrderRecord, now: number) {
  const start = new Date(order.submittedAt).getTime();
  const end = order.servedAt ? new Date(order.servedAt).getTime() : now;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
