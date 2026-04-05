"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ui/chart-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import type { ReportsPayload } from "@/lib/types";

export function ReportsPage({ data }: { data: ReportsPayload }) {
  const pieColors = ["#16a34a", "#f59e0b", "#eab308", "#ef4444"];
  const trendBarColor = "#16a34a";
  const roomTypeBarColor = "#f97316";
  const hasTrendData = data.monthlyTrend.some((item) => item.total > 0);
  const hasReservationTypeData = data.reservationTypeMix.some((item) => item.total > 0);
  const hasRoomTypeData = data.roomTypeMix.some((item) => item.total > 0);
  const hasTopCompanies = data.topCompanies.length > 0;

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard label="Active rooms" value={data.activeRooms} />
        <KpiCard label="Average attendees" value={data.averageAttendees} />
        <KpiCard label="Total bookings" value={data.totalBookings} />
        <KpiCard label="Top requested company" value={data.topCompanies[0]?.total ?? 0} meta={data.topCompanies[0]?.company ?? "No data"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <ChartCard title="Six-month booking trend" description="Confirmed and pending reservations">
          {hasTrendData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill={trendBarColor} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title="No trend data yet" message="The booking trend will appear here once reservations are available." />
          )}
        </ChartCard>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Top requested companies</h3>
          <div className="mt-4 space-y-3">
            {hasTopCompanies ? (
              data.topCompanies.map((company) => (
                <div key={company.company} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">{company.company}</span>
                  <span className="text-sm font-semibold text-slate-950">{company.total}</span>
                </div>
              ))
            ) : (
              <StatePanel title="No company demand yet" message="Requested company volume will appear once bookings are added." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <ChartCard title="Reservation type mix" description="Demand split by booking type">
          {hasReservationTypeData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.reservationTypeMix} dataKey="total" nameKey="type" innerRadius={60} outerRadius={100}>
                    {data.reservationTypeMix.map((entry, index) => (
                      <Cell key={entry.type} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 18 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title="No reservation mix yet" message="This donut chart will show booking-type distribution once reservations exist." />
          )}
        </ChartCard>

        <ChartCard title="Requested room types" description="Which room categories are used most often">
          {hasRoomTypeData ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.roomTypeMix}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill={roomTypeBarColor} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title="No room type demand yet" message="Room-type usage will appear here after bookings are recorded." />
          )}
        </ChartCard>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">Additional insights</h3>
          <div className="mt-4 space-y-3">
            <InsightRow label="Cancellation rate" value={`${data.cancellationRate}%`} />
            <InsightRow label="Food service bookings" value={String(data.foodServiceCount)} />
            <InsightRow label="Average attendees" value={String(data.averageAttendees)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
