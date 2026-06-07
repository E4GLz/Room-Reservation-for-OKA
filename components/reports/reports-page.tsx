"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/ui/chart-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import { DrillDownModal, type DrillFilter } from "@/components/ui/drill-down-modal";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import type { ReportsPayload } from "@/lib/types";

export function ReportsPage({ data }: { data: ReportsPayload }) {
  const { user } = useSession();
  const { t } = useLanguage();
  const [drillFilter, setDrillFilter] = useState<DrillFilter | null>(null);
  const openDrill = (filter: DrillFilter) => setDrillFilter(filter);
  const pieColors = ["#16a34a", "#f59e0b", "#eab308", "#ef4444"];
  const trendBarColor = "#16a34a";
  const roomTypeBarColor = "#f97316";
  const occupiedHoursColor = "#dc2626";
  const hasReservationTypeData = data.reservationTypeMix.some((item) => item.total > 0);
  const hasRoomTypeData = data.roomTypeMix.some((item) => item.total > 0);
  const hasTopCompanies = data.topCompanies.length > 0;
  const hasOccupiedHoursByRoom = data.occupiedHoursByRoom.some((item) => item.hours > 0);
  const hasHospitalityItems = data.hospitality.topItems.some((item) => item.total > 0);
  const hasFoodServiceDemand = data.totalBookings > 0;
  const foodServiceData = [
    { name: t("Food service requested"), value: data.foodServiceCount },
    { name: t("No food service"), value: Math.max(data.totalBookings - data.foodServiceCount, 0) }
  ].filter((item) => item.value > 0);
  const availableYears = useMemo(
    () => [...new Set(data.monthlyTrend.map((item) => item.year))].sort((a, b) => a - b),
    [data.monthlyTrend]
  );
  const latestPoint = data.monthlyTrend[data.monthlyTrend.length - 1];
  const [selectedYear, setSelectedYear] = useState<number>(latestPoint?.year ?? new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
  const filteredMonthlyTrend = useMemo(() => {
    const points = data.monthlyTrend.filter((item) => item.year === selectedYear);
    if (selectedMonth === "all") {
      return points;
    }
    const index = points.findIndex((item) => item.month === selectedMonth);
    return index >= 0 ? points.slice(0, index + 1) : points;
  }, [data.monthlyTrend, selectedMonth, selectedYear]);
  const filteredHoursTrend = useMemo(() => {
    const points = data.occupiedHoursTrend.filter((item) => item.year === selectedYear);
    if (selectedMonth === "all") {
      return points;
    }
    const index = points.findIndex((item) => item.month === selectedMonth);
    return index >= 0 ? points.slice(0, index + 1) : points;
  }, [data.occupiedHoursTrend, selectedMonth, selectedYear]);
  const hasFilteredTrendData = filteredMonthlyTrend.some((item) => item.total > 0);
  const hasFilteredHoursTrend = filteredHoursTrend.some((item) => item.hours > 0);

  if (user?.role !== "ADMIN") {
    return (
      <div className="px-8 py-6">
        <StatePanel
          title={t("Admin access required")}
          message={t("Detailed reports remain on the admin side. Staff users can use the dashboard and My Bookings for their own statistics.")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard label={t("Active rooms")} value={data.activeRooms} onClick={() => openDrill({ kind: "reservations", title: t("All reservations"), params: {} })} />
        <KpiCard label={t("Average attendees")} value={data.averageAttendees} onClick={() => openDrill({ kind: "reservations", title: t("All reservations"), params: {} })} />
        <KpiCard label={t("Total bookings")} value={data.totalBookings} onClick={() => openDrill({ kind: "reservations", title: t("Total bookings"), params: {} })} />
        <KpiCard label={t("Occupied hours")} value={data.occupiedHours} meta={t("Total booked time across reservations")} onClick={() => openDrill({ kind: "reservations", title: t("Occupied hours"), params: {} })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <ChartCard title={t("Booking trend")} description={t("Rolling twelve-month view across the reservation history")}>
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(Number(event.target.value));
                setSelectedMonth("all");
              }}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value === "all" ? "all" : Number(event.target.value))
              }
            >
              <option value="all">{t("All months")}</option>
              {filteredMonthlyTrend.map((item) => (
                <option key={`${item.year}-${item.month}`} value={item.month}>
                  {t(item.label)}
                </option>
              ))}
            </select>
          </div>
          {hasFilteredTrendData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredMonthlyTrend}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tickFormatter={(value) => t(String(value))} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, t("Bookings")]}
                    labelFormatter={(_, payload) => formatTrendLabel(payload?.[0]?.payload, t)}
                  />
                  <Bar
                    dataKey="total"
                    fill={trendBarColor}
                    radius={[10, 10, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(barData: { year?: number; month?: number; label?: string }) => {
                      if (barData.year && barData.month) {
                        const { start, end } = rptMonthRange(barData.year, barData.month);
                        openDrill({ kind: "reservations", title: barData.label ?? t("Booking trend"), params: { start, end } });
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title={t("No trend data yet")} message={t("The booking trend will appear here once reservations are available for the selected period.")} />
          )}
        </ChartCard>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">{t("Top requested companies")}</h3>
          <div className="mt-4 space-y-3">
            {hasTopCompanies ? (
              data.topCompanies.map((company) => (
                <div
                  key={company.company}
                  className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                  onClick={() => openDrill({ kind: "reservations", title: company.company, params: { chargedCompany: company.company } })}
                >
                  <span className="text-sm font-medium text-slate-700">{company.company}</span>
                  <span className="text-sm font-semibold text-slate-950">{company.total}</span>
                </div>
              ))
            ) : (
              <StatePanel title={t("No company demand yet")} message={t("Requested company volume will appear once bookings are added.")} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartCard title={t("Occupied hours trend")} description={t("Booked room hours by month")}>
          {hasFilteredHoursTrend ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredHoursTrend}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tickFormatter={(value) => t(String(value))} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value} ${t("hrs")}`, t("Occupied hours")]}
                    labelFormatter={(_, payload) => formatTrendLabel(payload?.[0]?.payload, t)}
                  />
                  <Bar
                    dataKey="hours"
                    fill={occupiedHoursColor}
                    radius={[10, 10, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(barData: { year?: number; month?: number; label?: string }) => {
                      if (barData.year && barData.month) {
                        const { start, end } = rptMonthRange(barData.year, barData.month);
                        openDrill({ kind: "reservations", title: barData.label ?? t("Occupied hours trend"), params: { start, end } });
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title={t("No occupied-hours trend yet")} message={t("The monthly room-hours trend will appear here once reservations with times are available for the selected period.")} />
          )}
        </ChartCard>

        <ChartCard title={t("Occupied hours by room")} description={t("Which rooms absorb the most booked time")}>
          {hasOccupiedHoursByRoom ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.occupiedHoursByRoom} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={92} />
                  <Tooltip formatter={(value: number) => [`${value} ${t("hrs")}`, t("Occupied hours")]} />
                  <Bar
                    dataKey="hours"
                    fill={occupiedHoursColor}
                    radius={[0, 10, 10, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(barData: { name?: string }) => {
                      if (barData.name) openDrill({ kind: "reservations", title: barData.name, params: { roomName: barData.name } });
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title={t("No room-hours yet")} message={t("Occupied room hours by room will appear here once reservations with times are available.")} />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <ChartCard title={t("Reservation type mix")} description={t("Demand split by booking type")}>
          {hasReservationTypeData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                data={data.reservationTypeMix}
                dataKey="total"
                nameKey="type"
                innerRadius={60}
                outerRadius={100}
                style={{ cursor: "pointer" }}
                onClick={(entry: { type?: string }) => {
                  if (entry.type) openDrill({ kind: "reservations", title: t(entry.type), params: { typeFilter: entry.type } });
                }}
              >
                    {data.reservationTypeMix.map((entry, index) => (
                      <Cell key={entry.type} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name) => [value, t(String(name))]} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 18 }} formatter={(value) => t(String(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title={t("No reservation mix yet")} message={t("This donut chart will show booking-type distribution once reservations exist.")} />
          )}
        </ChartCard>

        <ChartCard title={t("Requested room types")} description={t("Which room categories are used most often")}>
          {hasRoomTypeData ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.roomTypeMix}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="type" tickFormatter={(value) => t(String(value))} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number, name) => [value, t(String(name))]} />
                  <Bar
                    dataKey="total"
                    fill={roomTypeBarColor}
                    radius={[10, 10, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(barData: { type?: string }) => {
                      if (barData.type) openDrill({ kind: "reservations", title: t(barData.type), params: { roomType: barData.type } });
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title={t("No room type demand yet")} message={t("Room-type usage will appear here after bookings are recorded.")} />
          )}
        </ChartCard>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">{t("Additional insights")}</h3>
          <div className="mt-4 space-y-3">
            <InsightRow label={t("Cancellation rate")} value={`${data.cancellationRate}%`} onClick={() => openDrill({ kind: "reservations", title: t("Cancelled bookings"), params: { status: "CANCELLED" } })} />
            <InsightRow label={t("Food service bookings")} value={String(data.foodServiceCount)} onClick={() => openDrill({ kind: "reservations", title: t("Food service bookings"), params: { foodService: "true" } })} />
            <InsightRow label={t("Average attendees")} value={String(data.averageAttendees)} onClick={() => openDrill({ kind: "reservations", title: t("All reservations"), params: {} })} />
            <InsightRow label={t("Hospitality orders")} value={String(data.hospitality.totalOrders)} onClick={() => openDrill({ kind: "drinkOrders", title: t("Hospitality orders"), params: { history: "true" } })} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartCard title={t("Food service demand")} description={t("Share of reservations that requested food service support")}>
          {hasFoodServiceDemand ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={foodServiceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    style={{ cursor: "pointer" }}
                    onClick={(entry: { name?: string }) => {
                      const isFoodService = entry.name === t("Food service requested");
                      openDrill({ kind: "reservations", title: entry.name ?? t("Food service demand"), params: { foodService: isFoodService ? "true" : "false" } });
                    }}
                  >
                    {foodServiceData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name) => [value, t(String(name))]} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 18 }} formatter={(value) => t(String(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <StatePanel title={t("No food service demand yet")} message={t("Food service demand will appear once bookings are available.")} />
          )}
        </ChartCard>

        <ChartCard title={t("Drink types ordered")} description={t("Top beverage choices submitted by guests")}>
          {hasHospitalityItems ? (
            <div className="space-y-3">
              {data.hospitality.topItems.map((item) => {
                const maxValue = Math.max(...data.hospitality.topItems.map((entry) => entry.total), 1);
                return (
                  <div
                    key={item.name}
                    className="cursor-pointer rounded-[20px] bg-slate-50 p-3 transition hover:bg-slate-100"
                    onClick={() => openDrill({ kind: "drinkOrders", title: item.name, params: { itemName: item.name } })}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-sm font-semibold text-slate-950">{item.total}</p>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full"
                        style={{ width: `${Math.max((item.total / maxValue) * 100, 8)}%`, background: "linear-gradient(90deg,#16a34a,#f59e0b)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <StatePanel title={t("No hospitality orders yet")} message={t("Drink orders will appear here once guests submit hospitality requests.")} />
          )}
        </ChartCard>
      </div>
      <DrillDownModal filter={drillFilter} onClose={() => setDrillFilter(null)} />
    </div>
  );
}

function rptMonthRange(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1).toISOString().split("T")[0],
    end: new Date(year, month, 0).toISOString().split("T")[0]
  };
}

function InsightRow({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <div
      className={`rounded-2xl bg-slate-50 px-4 py-3 ${onClick ? "cursor-pointer transition hover:bg-slate-100" : ""}`}
      onClick={onClick}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
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
