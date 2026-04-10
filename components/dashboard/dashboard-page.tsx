"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  CircleOff,
  ClipboardList,
  Clock3,
  UtensilsCrossed,
  DoorOpen,
  TimerReset,
  UserRound
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartCard } from "@/components/ui/chart-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { ReservationCard } from "@/components/planner/reservation-card";
import { StatePanel } from "@/components/ui/state-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { readErrorMessage } from "@/lib/client-errors";
import { formatLongDate } from "@/lib/utils";
import type { DashboardPayload, ReservationRecord } from "@/lib/types";

export function DashboardPage({ data }: { data: DashboardPayload }) {
  const { user } = useSession();
  const { t, language } = useLanguage();
  const isAdmin = user?.role === "ADMIN";
  const [managerApprovals, setManagerApprovals] = useState<ReservationRecord[]>([]);
  const [managerApprovalsLoading, setManagerApprovalsLoading] = useState(false);
  const [managerActionId, setManagerActionId] = useState("");
  const [managerMessage, setManagerMessage] = useState("");
  const pieColors = ["#16a34a", "#f59e0b", "#eab308", "#f97316", "#ef4444"];
  const trendColor = "#16a34a";
  const roomDemandGradient = "linear-gradient(90deg,#16a34a,#f59e0b)";
  const weekdayPatternColor = "#f97316";
  const occupiedHoursColor = "#dc2626";
  const userCardGradient = "linear-gradient(180deg,rgba(245,158,11,0.12),rgba(239,68,68,0.04))";
  const userProgressGradient = "linear-gradient(90deg,#f59e0b,#ef4444)";
  const peakWeekday = t([...data.weekdayPattern].sort((a, b) => b.total - a.total)[0]?.day ?? "N/A");
  const quietWeekday = t([...data.weekdayPattern].sort((a, b) => a.total - b.total)[0]?.day ?? "N/A");
  const maxRoomDemand = Math.max(...data.bookingsByRoom.map((item) => item.total), 1);
  const hasTypeData = data.bookingsByEventType.some((item) => item.total > 0);
  const hasRoomDemand = data.bookingsByRoom.some((item) => item.total > 0);
  const hasOccupiedHours = data.occupiedHoursByRoom.some((item) => item.hours > 0);
  const hasWeekdayData = data.weekdayPattern.some((item) => item.total > 0);
  const hasBusiestDays = data.busiestDays.length > 0;
  const hasOccupiedHoursTrend = data.occupiedHoursTrend.some((item) => item.hours > 0);
  const availableTrendYears = [...new Set(data.monthlyTrend.map((item) => item.year))].sort((a, b) => a - b);
  const latestTrendPoint = data.monthlyTrend[data.monthlyTrend.length - 1];
  const [selectedTrendYear, setSelectedTrendYear] = useState<number>(latestTrendPoint?.year ?? new Date().getFullYear());
  const [selectedTrendMonth, setSelectedTrendMonth] = useState<number | "all">("all");
  const filteredTrendData = useMemo(() => {
    const points = data.monthlyTrend.filter((item) => item.year === selectedTrendYear);
    if (selectedTrendMonth === "all") {
      return points;
    }
    const index = points.findIndex((item) => item.month === selectedTrendMonth);
    return index >= 0 ? points.slice(0, index + 1) : points;
  }, [data.monthlyTrend, selectedTrendMonth, selectedTrendYear]);
  const hasTrendData = filteredTrendData.some((item) => item.total > 0);
  const currentUserActivity =
    data.activityByRequester.find((entry) => entry.email === user?.email) ?? data.defaultUserActivity;
  const currentUserShare =
    data.totals.totalThisMonth === 0 ? 0 : Math.round((currentUserActivity.total / data.totals.totalThisMonth) * 100);
  const hasAdminReminderRecipients = data.adminReminderConfig.recipientEmails.length > 0;
  const ownUpcoming = data.upcoming.filter((reservation) => reservation.requesterEmail === user?.email);
  const totalTypeBookings = data.bookingsByEventType.reduce((sum, item) => sum + item.total, 0);
  const typeMixData = data.bookingsByEventType.map((item) => ({
    ...item,
    percent: totalTypeBookings === 0 ? 0 : Math.round((item.total / totalTypeBookings) * 100)
  }));

  useEffect(() => {
    if (!user) {
      setManagerApprovals([]);
      return;
    }

    async function loadManagerApprovals() {
      setManagerApprovalsLoading(true);
      try {
        const response = await fetch(`/api/manager-approvals?managerEmail=${encodeURIComponent(user.email)}`);

        if (!response.ok) {
          setManagerApprovals([]);
          setManagerMessage(await readErrorMessage(response, t("Unable to load team approvals.")));
          setManagerApprovalsLoading(false);
          return;
        }

        const payload = await response.json();
        setManagerApprovals(payload);
        setManagerApprovalsLoading(false);
      } catch (loadError) {
        setManagerApprovals([]);
        setManagerMessage(loadError instanceof Error ? loadError.message : t("Unable to load team approvals."));
        setManagerApprovalsLoading(false);
      }
    }

    void loadManagerApprovals();
  }, [user]);

  async function handleManagerApproval(reservationId: string, action: "approve" | "reject") {
    if (!user) {
      return;
    }

    setManagerActionId(reservationId);
    setManagerMessage("");

    try {
      const response = await fetch(`/api/reservations/${reservationId}/manager-approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          actorName: user.name,
          actorEmail: user.email,
          actorRole: user.role
        })
      });

      if (!response.ok) {
        setManagerMessage(await readErrorMessage(response, t("Unable to process manager approval.")));
        setManagerActionId("");
        return;
      }

      setManagerApprovals((current) => current.filter((item) => item.id !== reservationId));
      setManagerMessage(
        action === "approve"
          ? t("Request approved and forwarded to admin.")
          : t("Request rejected by manager review.")
      );
      setManagerActionId("");
    } catch (actionError) {
      setManagerMessage(actionError instanceof Error ? actionError.message : t("Unable to process manager approval."));
      setManagerActionId("");
    }
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#1b256b_0%,#2557e5_52%,#8cb2ff_132%)] text-white">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/70">{t("Operations snapshot")}</p>
            {isAdmin ? (
              <>
                <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
                  {languageAwareCount(data.totals.todayCount)} {t("bookings today")}, {languageAwareCount(data.totals.pendingThisMonth)} {t("still waiting for approval")}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                  {t("The busiest room this month is")} {data.highlights.busiestRoom.name}, {t("while average building utilization is")} {data.highlights.averageUtilization}% {t("across")} {languageAwareCount(data.totals.activeRooms)} {t("active rooms")}.
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
                  {languageAwareCount(currentUserActivity.total)} {t("bookings are under your account this month.")}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                  {t("Use the planner to follow the room schedule and use My Bookings to review your own booking history and statuses.")}
                </p>
              </>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/planner">
                <Button variant="secondary" className="shadow-sm">
                  {t("Open planner")}
                </Button>
              </Link>
              {isAdmin ? (
                <Link href="/bookings/new">
                  <Button variant="secondary" className="shadow-sm">
                    {t("Create booking")}
                  </Button>
                </Link>
              ) : (
                <Link href="/my-bookings">
                  <Button variant="secondary" className="shadow-sm">
                    {t("My bookings")}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {isAdmin ? (
              <>
                <MiniStat
                  label={t("Highest utilization")}
                  value={data.highlights.highestUtilizationRoom.name}
                  hint={`${data.highlights.highestUtilizationRoom.utilization}% ${t("occupied days")}`}
                />
                <MiniStat
                  label={t("Month over month")}
                  value={`${data.highlights.monthOverMonthDelta > 0 ? "+" : ""}${data.highlights.monthOverMonthDelta}%`}
                  hint={t("Compared with last month")}
                />
                <MiniStat label={t("Lowest utilization")} value={data.highlights.leastUsedRoom.name} hint={`${data.highlights.leastUsedRoom.utilization}% ${t("used days")}`} />
                <MiniStat label={t("Most active weekday")} value={peakWeekday} hint={t("Pattern from reservation history")} />
              </>
            ) : (
              <>
                <MiniStat label={t("Confirmed")} value={String(currentUserActivity.confirmed)} hint={t("Bookings confirmed under your account")} />
                <MiniStat label={t("Pending")} value={String(currentUserActivity.pending)} hint={t("Reservations still awaiting manager or admin review")} />
                <MiniStat label={t("Share of month")} value={`${currentUserShare}%`} hint={t("Your portion of this month's activity")} />
                <MiniStat label={t("Upcoming")} value={String(ownUpcoming.length)} hint={t("Bookings coming up soon under your account")} />
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          label={isAdmin ? t("Bookings this month") : t("My bookings this month")}
          value={isAdmin ? data.totals.totalThisMonth : currentUserActivity.total}
          meta={
            isAdmin
              ? `${data.totals.activeRooms} ${t("active rooms")}`
              : `${ownUpcoming.length} ${t("upcoming under your account")}`
          }
          icon={<CalendarClock className="h-5 w-5" />}
          tone="accent"
        />
        <KpiCard
          label={isAdmin ? t("Pending approvals") : t("My pending")}
          value={isAdmin ? data.totals.pendingThisMonth : currentUserActivity.pending}
          meta={isAdmin ? t("Requests waiting on confirmation") : t("Waiting for manager or admin review")}
          icon={<TimerReset className="h-5 w-5" />}
          tone="warning"
        />
        <KpiCard
          label={isAdmin ? t("Confirmed bookings") : t("My confirmed")}
          value={isAdmin ? data.totals.confirmedThisMonth : currentUserActivity.confirmed}
          meta={isAdmin ? `${data.totals.todayCount} ${t("on today's agenda")}` : t("Approved and active")}
          icon={<CheckCheck className="h-5 w-5" />}
          tone="soft"
        />
        <KpiCard
          label={isAdmin ? t("Cancelled this month") : t("My schedule share")}
          value={isAdmin ? data.totals.cancelledThisMonth : currentUserShare}
          meta={isAdmin ? `${data.totals.tomorrowCount} ${t("scheduled tomorrow")}` : t("Percent of this month's total")}
          icon={<CircleOff className="h-5 w-5" />}
        />
      </div>

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <ChartCard title={t("Occupied hours trend")} description={t("Rolling twelve-month view of booked room hours")}>
            {hasOccupiedHoursTrend ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.occupiedHoursTrend}>
                    <defs>
                      <linearGradient id="occupiedHoursFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor={occupiedHoursColor} stopOpacity={0.34} />
                        <stop offset="95%" stopColor={occupiedHoursColor} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(24,33,43,0.08)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickFormatter={(value) => t(String(value))} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => [`${value} ${t("hrs")}`, t("Occupied hours")]}
                      labelFormatter={(_, payload) => formatTrendLabel(payload?.[0]?.payload, t)}
                    />
                    <Area type="monotone" dataKey="hours" stroke={occupiedHoursColor} strokeWidth={3} fill="url(#occupiedHoursFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
                <StatePanel title={t("No occupied-hours data yet")} message={t("Booked room hours will appear here once reservations with time ranges are available.")} />
            )}
          </ChartCard>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{t("Occupied hours this month")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("Total booked room time across the current month.")}</p>
              </div>
              <Clock3 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="mt-4 rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">{t("Current month booked hours")}</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">{data.totals.occupiedHoursThisMonth}</p>
              <p className="mt-2 text-sm text-slate-600">{t("This reflects reservation time ranges, not only booking counts.")}</p>
            </div>
          </Card>
        </div>
      ) : null}

      {!isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{t("My upcoming bookings")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("Only reservations created under your account are shown here.")}</p>
              </div>
              <DoorOpen className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="mt-4 space-y-3">
              {ownUpcoming.length === 0 ? (
                <StatePanel title={t("No upcoming bookings")} message={t("Your future reservations will appear here once an admin schedules them under your account.")} />
              ) : (
                ownUpcoming.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{t("Quick access")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("Use these pages for daily staff access without admin controls.")}</p>
              </div>
              <UserRound className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="mt-4 space-y-3">
              <Link href="/planner">
                <Button variant="secondary" className="w-full justify-start">{t("Open schedule planner")}</Button>
              </Link>
              <Link href="/my-bookings">
                <Button variant="secondary" className="w-full justify-start">{t("Open my booking history")}</Button>
              </Link>
              <div className="rounded-[18px] bg-slate-50 px-4 py-4 text-sm text-slate-600">
                {t("Room setup, booking creation, edits, cancellations, users, and settings remain managed from the admin side.")}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {user && (managerApprovalsLoading || managerApprovals.length > 0 || Boolean(managerMessage)) ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{t("Team approvals")}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("Requests from staff who report to you will appear here for manager review first.")}
              </p>
            </div>
            <AlertCircle className="h-5 w-5 text-[var(--accent)]" />
          </div>

          <div className="mt-4 space-y-3">
            {managerMessage ? (
              <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-700">{managerMessage}</div>
            ) : null}
            {managerApprovalsLoading ? (
              <StatePanel title={t("Loading approvals")} message={t("Checking whether any team requests need your approval.")} />
            ) : managerApprovals.length === 0 ? (
              <StatePanel title={t("No team approvals waiting")} message={t("There are no staff booking requests currently waiting on your manager approval.")} />
            ) : (
              managerApprovals.map((reservation) => (
                <div key={reservation.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{reservation.guestCompany}</p>
                      <p className="mt-1 text-sm text-slate-600">{reservation.chargedDepartment}</p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.12em] text-slate-500">
                      {reservation.requesterName}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      {reservation.startTime} - {reservation.endTime}
                    </span>
                    <span>{reservation.room.name}</span>
                    <span>{formatLocalizedDate(reservation.reservationDate, language)}</span>
                    <span>{reservation.attendeesCount} {t("attendees")}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="ghost"
                      disabled={managerActionId === reservation.id}
                      onClick={() => handleManagerApproval(reservation.id, "reject")}
                    >
                      {t("Reject")}
                    </Button>
                    <Button
                      disabled={managerActionId === reservation.id}
                      onClick={() => handleManagerApproval(reservation.id, "approve")}
                    >
                      {managerActionId === reservation.id ? t("Saving...") : t("Approve and send to admin")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {isAdmin ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <ChartCard title={t("Reservation trend")} description={t("Rolling twelve-month view based on reservation history")}>
              <div className="mb-4 flex flex-wrap gap-2">
                <select
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  value={selectedTrendYear}
                  onChange={(event) => {
                    setSelectedTrendYear(Number(event.target.value));
                    setSelectedTrendMonth("all");
                  }}
                >
                  {availableTrendYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  value={selectedTrendMonth}
                  onChange={(event) =>
                    setSelectedTrendMonth(event.target.value === "all" ? "all" : Number(event.target.value))
                  }
                >
                  <option value="all">{t("All months")}</option>
                    {data.monthlyTrend
                      .filter((item) => item.year === selectedTrendYear)
                      .map((item) => (
                        <option key={`${item.year}-${item.month}`} value={item.month}>
                          {t(item.label)}
                        </option>
                      ))}
                </select>
              </div>
              {hasTrendData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredTrendData}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={trendColor} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(24,33,43,0.08)" />
                      <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} tickFormatter={(value) => t(String(value))} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip
                        labelFormatter={(_, payload) => formatTrendLabel(payload?.[0]?.payload, t)}
                        formatter={(value: number) => [value, t("Bookings")]}
                      />
                      <Area type="monotone" dataKey="total" stroke={trendColor} strokeWidth={3} fill="url(#trendFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <StatePanel title={t("No trend data yet")} message={t("This chart will fill in as reservations are added for the selected period.")} />
              )}
            </ChartCard>

            <ChartCard title={t("Reservation type mix")} description={t("Distribution across all imported and current reservations")}>
              {hasTypeData ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeMixData}
                        dataKey="total"
                        nameKey="type"
                        innerRadius={62}
                        outerRadius={100}
                        paddingAngle={3}
                        label={({ payload }) => `${(payload as { percent?: number } | undefined)?.percent ?? 0}%`}
                        labelLine={false}
                      >
                        {typeMixData.map((entry, index) => (
                          <Cell key={entry.type} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                          formatter={(_, name, item) => {
                            const payload = item?.payload as { percent?: number } | undefined;
                            return [`${payload?.percent ?? 0}%`, t(String(name))];
                          }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 18 }}
                        formatter={(value, entry) => {
                          const payload = entry?.payload as { percent?: number } | undefined;
                          return `${t(String(value))} (${payload?.percent ?? 0}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <StatePanel title={t("No reservation mix yet")} message={t("Once bookings are created, this view will show which reservation types are driving demand.")} />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <ChartCard title={t("Room demand")} description={t("Most frequently booked rooms across reservation history")}>
              {hasRoomDemand ? (
                <div className="space-y-3">
                  {data.bookingsByRoom.map((room) => {
                    return (
                      <div key={room.name} className="rounded-[20px] bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">{room.name}</p>
                          <p className="text-sm font-semibold text-slate-950">{room.total}</p>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-200">
                          <div
                            className="h-2.5 rounded-full"
                            style={{ background: roomDemandGradient, width: `${Math.max((room.total / maxRoomDemand) * 100, 6)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <StatePanel title={t("No room demand yet")} message={t("Room demand will appear here as soon as bookings are registered.")} />
              )}
            </ChartCard>

            <ChartCard title={t("Occupied hours by room")} description={t("Which rooms carry the highest booked time load")}>
              {hasOccupiedHours ? (
                <div className="h-[28rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.occupiedHoursByRoom} layout="vertical" margin={{ top: 8, right: 14, bottom: 8, left: 8 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(24,33,43,0.08)" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [`${value} ${t("hrs")}`, t("Occupied hours")]} />
                      <Bar dataKey="hours" radius={[0, 12, 12, 0]} barSize={22} fill={occupiedHoursColor} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <StatePanel title={t("No occupied-hours data yet")} message={t("Booked room hours by room will appear here once reservations with time ranges are available.")} />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <ChartCard title={t("Weekday booking pattern")} description={t("All-time booking pattern to identify the most requested weekdays")}>
              {hasWeekdayData ? (
                <>
                  <div className="h-[28rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.weekdayPattern} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(24,33,43,0.08)" />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="day" width={42} tickLine={false} axisLine={false} tickFormatter={(value) => t(String(value))} />
                        <Tooltip formatter={(value: number) => [value, t("Bookings")]} labelFormatter={(label) => t(String(label))} />
                        <Bar dataKey="total" radius={[0, 12, 12, 0]} barSize={26} fill={weekdayPatternColor} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <InsightPill label={t("Peak day")} value={peakWeekday} />
                    <InsightPill label={t("Quietest day")} value={quietWeekday} />
                  </div>
                </>
              ) : (
                <StatePanel title={t("No booking pattern yet")} message={t("This chart will show the busiest weekdays once reservations exist.")} />
              )}
            </ChartCard>
          </div>
        </>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{t("Pending approvals")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("Requests that likely need admin attention next.")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/planner?status=PENDING&view=list">
                  <Button variant="secondary">{t("Review pending")}</Button>
                </Link>
                <AlertCircle className="h-5 w-5 text-[var(--accent)]" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {data.pendingApprovals.length === 0 ? (
                <StatePanel title={t("Nothing waiting")} message={t("All current requests have already been reviewed.")} />
              ) : (
                data.pendingApprovals.map((reservation) => (
                  <ReservationCard key={reservation.id} reservation={reservation} />
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{t("Your bookings this month")}</h3>
                <p className="mt-1 text-sm text-slate-500">{t("Booking activity for the currently signed-in user.")}</p>
              </div>
              <UserRound className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="mt-4 rounded-[24px] p-5" style={{ background: userCardGradient }}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">{t("Reservations under your account")}</p>
                  <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
                    {currentUserActivity.total}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm ring-1 ring-[var(--line)]">
                  <ClipboardList className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {t("Confirmed")}: {currentUserActivity.confirmed} | {t("Pending")}: {currentUserActivity.pending}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-[var(--line)]">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("Share of monthly total")}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{currentUserShare}%</p>
                </div>
                <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-[var(--line)]">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("Upcoming reminder window")}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {data.adminReminderConfig.hours}h
                  </p>
                </div>
              </div>
              <div className="mt-5 h-2.5 rounded-full bg-white/90 ring-1 ring-[var(--line)]">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    background: userProgressGradient,
                    width: `${data.totals.totalThisMonth === 0 ? 0 : Math.max(currentUserShare, 8)}%`
                  }}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{t("Automatic reminder queue")}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t("Upcoming meeting reminders will be sent automatically to admin email recipients.")}
                </p>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                {t("Auto")}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{t("Recipients")}</p>
                <p className="mt-1">
                  {hasAdminReminderRecipients
                    ? data.adminReminderConfig.recipientEmails.join(", ")
                    : t("No active admin email found.")}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {t("Reminder lead time")}: {data.adminReminderConfig.hours} {t("hours")}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {t("Delivery mode")}: {t("Scheduled automatic reminder")}
                </p>
              </div>
              {data.upcomingAdminReminders.length === 0 ? (
                <StatePanel
                  title={t("No reminder emails queued")}
                  message={t("No confirmed upcoming bookings fall inside the configured reminder window.")}
                />
              ) : (
                data.upcomingAdminReminders.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{notification.subject}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {notification.reservation.chargedDepartment}
                        </p>
                      </div>
                      <Link
                        href={`/bookings/${notification.reservation.id}`}
                        className="text-slate-400 transition hover:text-slate-700"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {notification.reservation.startTime} - {notification.reservation.endTime}
                      </span>
                      <span>{notification.reservation.room.name}</span>
                      <span>{formatLocalizedDate(notification.reservation.reservationDate, language)}</span>
                      <span>{notification.startsInHours}{t("h remaining")}</span>
                    </div>
                    {notification.reservation.foodServiceRequired ? (
                      <div className="mt-3 rounded-[16px] bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                        <div className="flex items-center gap-2 font-medium">
                          <UtensilsCrossed className="h-4 w-4" />
                          {t("Food service requested")}
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-700">
                          {notification.reservation.foodServiceLocation || t("Location not set")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {isAdmin ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{t("Next agenda")}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("What staff should be preparing for today and tomorrow.")}
              </p>
            </div>
            <DoorOpen className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {data.upcoming.length === 0 ? (
              <div className="xl:col-span-2">
                <StatePanel
                  title={t("No immediate bookings")}
                  message={t("There are no upcoming reservations in the next two days.")}
                />
              </div>
            ) : (
              data.upcoming.map((reservation) => (
                <div key={reservation.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{reservation.guestCompany}</p>
                      <p className="mt-1 text-sm text-slate-600">{reservation.chargedDepartment}</p>
                    </div>
                    <Link
                      href={`/bookings/${reservation.id}`}
                      className="text-slate-400 transition hover:text-slate-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      {reservation.startTime} - {reservation.endTime}
                    </span>
                    <span>{reservation.room.name}</span>
                    <span>{formatLocalizedDate(reservation.reservationDate, language)}</span>
                  </div>
                  {reservation.foodServiceRequired ? (
                    <div className="mt-3 rounded-[16px] bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                      <div className="flex items-center gap-2 font-medium">
                        <UtensilsCrossed className="h-4 w-4" />
                        {t("Food service requested")}
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-700">
                        {reservation.foodServiceLocation || t("Location not set")}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{t("Busiest booking dates")}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t("Highest-demand dates across the imported reservation history.")}
                </p>
            </div>
            <CalendarClock className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {hasBusiestDays ? (
              data.busiestDays.map((day, index) => (
                <div key={day.date} className="rounded-[18px] bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("Rank")} #{index + 1}</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">{formatLocalizedDate(day.date, language)}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{day.total}</p>
                  <p className="text-xs text-slate-500">{t("bookings")}</p>
                </div>
              ))
            ) : (
              <div className="lg:col-span-5">
                <StatePanel
                  title={t("No peak dates yet")}
                  message={t("When bookings are added, the highest-demand dates will surface here.")}
                />
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/62">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-white/70">{hint}</p>
    </div>
  );
}

function InsightPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function languageAwareCount(value: number) {
  return value.toLocaleString();
}

function formatLocalizedDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatTrendLabel(
  payload: { shortLabel?: string; year?: number; label?: string } | undefined,
  t: (text: string) => string
) {
  if (!payload) {
    return "";
  }

  if (payload.shortLabel && payload.year) {
    return `${t(payload.shortLabel)} ${payload.year}`;
  }

  return payload.label ? t(payload.label) : "";
}
