"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCheck,
  CircleOff,
  ClipboardList,
  Clock3,
  Mail,
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
import { useSession } from "@/components/providers/session-provider";
import { formatLongDate } from "@/lib/utils";
import type { DashboardPayload } from "@/lib/types";

export function DashboardPage({ data }: { data: DashboardPayload }) {
  const { user } = useSession();
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const pieColors = ["#16a34a", "#f59e0b", "#eab308", "#f97316", "#ef4444"];
  const trendColor = "#16a34a";
  const roomDemandGradient = "linear-gradient(90deg,#16a34a,#f59e0b)";
  const weekdayPatternColor = "#f97316";
  const userCardGradient = "linear-gradient(180deg,rgba(245,158,11,0.12),rgba(239,68,68,0.04))";
  const userProgressGradient = "linear-gradient(90deg,#f59e0b,#ef4444)";
  const peakWeekday = [...data.weekdayPattern].sort((a, b) => b.total - a.total)[0]?.day ?? "N/A";
  const quietWeekday = [...data.weekdayPattern].sort((a, b) => a.total - b.total)[0]?.day ?? "N/A";
  const maxRoomDemand = Math.max(...data.bookingsByRoom.map((item) => item.total), 1);
  const hasTrendData = data.monthlyTrend.some((item) => item.total > 0);
  const hasTypeData = data.bookingsByEventType.some((item) => item.total > 0);
  const hasRoomDemand = data.bookingsByRoom.some((item) => item.total > 0);
  const hasWeekdayData = data.weekdayPattern.some((item) => item.total > 0);
  const hasBusiestDays = data.busiestDays.length > 0;
  const currentUserActivity =
    data.activityByRequester.find((entry) => entry.email === user?.email) ?? data.defaultUserActivity;
  const currentUserShare =
    data.totals.totalThisMonth === 0 ? 0 : Math.round((currentUserActivity.total / data.totals.totalThisMonth) * 100);
  const hasAdminReminderRecipients = data.adminReminderConfig.recipientEmails.length > 0;

  async function handleSendReminders() {
    setSendingReminders(true);
    setSendMessage("");

    const response = await fetch("/api/notifications/upcoming-reminders", {
      method: "POST"
    });
    const payload = await response.json();

    if (!response.ok) {
      setSendMessage(payload.error || "Unable to send reminder emails.");
      setSendingReminders(false);
      return;
    }

    setSendMessage(
      `${payload.sentCount} reminder email(s) sent, ${payload.skippedCount} already sent previously.`
    );
    setSendingReminders(false);
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <Card className="overflow-hidden bg-[linear-gradient(135deg,#1b256b_0%,#2557e5_52%,#8cb2ff_132%)] text-white">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/70">Operations snapshot</p>
            <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">
              {data.totals.todayCount} bookings today, {data.totals.pendingThisMonth} still waiting for approval.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
              The busiest room this month is {data.highlights.busiestRoom.name}, while average building utilization is {data.highlights.averageUtilization}% across {data.totals.activeRooms} active rooms.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/planner">
                <Button variant="secondary" className="shadow-sm">
                  Open planner
                </Button>
              </Link>
              <Link href="/bookings/new">
                <Button variant="secondary" className="shadow-sm">
                  Create booking
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Highest utilization"
              value={data.highlights.highestUtilizationRoom.name}
              hint={`${data.highlights.highestUtilizationRoom.utilization}% occupied days`}
            />
            <MiniStat
              label="Month over month"
              value={`${data.highlights.monthOverMonthDelta > 0 ? "+" : ""}${data.highlights.monthOverMonthDelta}%`}
              hint="Compared with last month"
            />
            <MiniStat label="Lowest utilization" value={data.highlights.leastUsedRoom.name} hint={`${data.highlights.leastUsedRoom.utilization}% used days`} />
            <MiniStat label="Most active weekday" value={peakWeekday} hint="Pattern from this month's reservations" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          label="Bookings this month"
          value={data.totals.totalThisMonth}
          meta={`${data.totals.activeRooms} active rooms`}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="accent"
        />
        <KpiCard
          label="Pending approvals"
          value={data.totals.pendingThisMonth}
          meta="Requests waiting on confirmation"
          icon={<TimerReset className="h-5 w-5" />}
          tone="warning"
        />
        <KpiCard
          label="Confirmed bookings"
          value={data.totals.confirmedThisMonth}
          meta={`${data.totals.todayCount} on today's agenda`}
          icon={<CheckCheck className="h-5 w-5" />}
          tone="soft"
        />
        <KpiCard
          label="Cancelled this month"
          value={data.totals.cancelledThisMonth}
          meta={`${data.totals.tomorrowCount} scheduled tomorrow`}
          icon={<CircleOff className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartCard title="Reservation trend" description="Rolling six-month view of confirmed and pending activity">
          {hasTrendData ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={trendColor} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(24,33,43,0.08)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke={trendColor} strokeWidth={3} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title="No trend data yet" message="This chart will fill in as reservations are added for the last six months." />
          )}
        </ChartCard>

        <ChartCard title="Reservation type mix" description="Where this month's demand is coming from">
          {hasTypeData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.bookingsByEventType} dataKey="total" nameKey="type" innerRadius={62} outerRadius={100} paddingAngle={3}>
                    {data.bookingsByEventType.map((entry, index) => (
                      <Cell key={entry.type} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 18 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title="No reservation mix yet" message="Once bookings are created, this view will show which reservation types are driving demand." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartCard title="Room demand" description="Most frequently booked rooms this month">
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
            <StatePanel title="No room demand yet" message="Room demand will appear here as soon as bookings are registered for the month." />
          )}
        </ChartCard>

        <ChartCard title="Weekday booking pattern" description="Helps identify the most heavily requested day pattern">
          {hasWeekdayData ? (
            <>
              <div className="h-[28rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekdayPattern} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(24,33,43,0.08)" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="day" width={42} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[0, 12, 12, 0]} barSize={26} fill={weekdayPatternColor} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <InsightPill label="Peak day" value={peakWeekday} />
                <InsightPill label="Quietest day" value={quietWeekday} />
              </div>
            </>
          ) : (
            <StatePanel title="No booking pattern yet" message="This chart will show the busiest weekdays once reservations exist for the current month." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Pending approvals</h3>
              <p className="mt-1 text-sm text-slate-500">Requests that likely need admin attention next.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/planner?status=PENDING&view=list">
                <Button variant="secondary">Review pending</Button>
              </Link>
              <AlertCircle className="h-5 w-5 text-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.pendingApprovals.length === 0 ? (
              <StatePanel title="Nothing waiting" message="All current requests have already been reviewed." />
            ) : (
              data.pendingApprovals.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Your bookings this month</h3>
              <p className="mt-1 text-sm text-slate-500">Booking activity for the currently signed-in user.</p>
            </div>
            <UserRound className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="mt-4 rounded-[24px] p-5" style={{ background: userCardGradient }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Reservations under your account</p>
                <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">{currentUserActivity.total}</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm ring-1 ring-[var(--line)]">
                <ClipboardList className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Confirmed: {currentUserActivity.confirmed} | Pending: {currentUserActivity.pending}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-[var(--line)]">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Share of monthly total</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  {currentUserShare}%
                </p>
              </div>
              <div className="rounded-[20px] bg-white px-4 py-3 ring-1 ring-[var(--line)]">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Upcoming reminder window</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{data.adminReminderConfig.hours}h</p>
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
              <h3 className="text-lg font-semibold text-slate-950">Admin reminder queue</h3>
              <p className="mt-1 text-sm text-slate-500">Upcoming meeting reminders prepared for admin email delivery.</p>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "ADMIN" ? (
                <Button
                  variant="secondary"
                  onClick={handleSendReminders}
                  disabled={sendingReminders || data.upcomingAdminReminders.length === 0 || !hasAdminReminderRecipients}
                >
                  {sendingReminders ? "Sending..." : "Send reminder emails"}
                </Button>
              ) : null}
              <Mail className="h-5 w-5 text-[var(--accent)]" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Recipients</p>
              <p className="mt-1">
                {hasAdminReminderRecipients
                  ? data.adminReminderConfig.recipientEmails.join(", ")
                  : "No active admin email found."}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                Reminder lead time: {data.adminReminderConfig.hours} hours
              </p>
            </div>
            {sendMessage ? (
              <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {sendMessage}
              </div>
            ) : null}
            {data.upcomingAdminReminders.length === 0 ? (
              <StatePanel title="No reminder emails queued" message="No confirmed upcoming bookings fall inside the configured reminder window." />
            ) : (
              data.upcomingAdminReminders.map((notification) => (
                <div key={notification.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{notification.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.reservation.chargedDepartment}</p>
                    </div>
                    <Link href={`/bookings/${notification.reservation.id}`} className="text-slate-400 transition hover:text-slate-700">
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      {notification.reservation.startTime} - {notification.reservation.endTime}
                    </span>
                    <span>{notification.reservation.room.name}</span>
                    <span>{formatLongDate(notification.reservation.reservationDate)}</span>
                    <span>{notification.startsInHours}h remaining</span>
                  </div>
                  {notification.reservation.foodServiceRequired ? (
                    <div className="mt-3 rounded-[16px] bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                      <div className="flex items-center gap-2 font-medium">
                        <UtensilsCrossed className="h-4 w-4" />
                        Food service requested
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-700">
                        {notification.reservation.foodServiceLocation || "Location not set"}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Next agenda</h3>
            <p className="mt-1 text-sm text-slate-500">What staff should be preparing for today and tomorrow.</p>
          </div>
          <DoorOpen className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {data.upcoming.length === 0 ? (
            <div className="xl:col-span-2">
              <StatePanel title="No immediate bookings" message="There are no upcoming reservations in the next two days." />
            </div>
          ) : (
            data.upcoming.map((reservation) => (
              <div key={reservation.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{reservation.guestCompany}</p>
                    <p className="mt-1 text-sm text-slate-600">{reservation.chargedDepartment}</p>
                  </div>
                  <Link href={`/bookings/${reservation.id}`} className="text-slate-400 transition hover:text-slate-700">
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {reservation.startTime} - {reservation.endTime}
                  </span>
                  <span>{reservation.room.name}</span>
                  <span>{formatLongDate(reservation.reservationDate)}</span>
                </div>
                {reservation.foodServiceRequired ? (
                  <div className="mt-3 rounded-[16px] bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                    <div className="flex items-center gap-2 font-medium">
                      <UtensilsCrossed className="h-4 w-4" />
                      Food service requested
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-700">
                      {reservation.foodServiceLocation || "Location not set"}
                    </p>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Busiest booking dates</h3>
            <p className="mt-1 text-sm text-slate-500">Specific dates that may need extra prep capacity.</p>
          </div>
          <CalendarClock className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {hasBusiestDays ? (
            data.busiestDays.map((day, index) => (
              <div key={day.date} className="rounded-[18px] bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Rank #{index + 1}</p>
                <p className="mt-3 text-sm font-medium text-slate-900">{day.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{day.total}</p>
                <p className="text-xs text-slate-500">bookings</p>
              </div>
            ))
          ) : (
            <div className="lg:col-span-5">
              <StatePanel title="No peak dates yet" message="When bookings are added, the busiest dates of the month will surface here." />
            </div>
          )}
        </div>
      </Card>
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
