"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import type { DrinkOrderRecord, ReservationRecord } from "@/lib/types";

export type DrillFilter =
  | { kind: "reservations"; params: Record<string, string>; title: string }
  | { kind: "drinkOrders"; params: Record<string, string>; title: string };

export function DrillDownModal({
  filter,
  onClose
}: {
  filter: DrillFilter | null;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [drinkOrders, setDrinkOrders] = useState<DrinkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!filter) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filter]);

  useEffect(() => {
    if (!filter) return;
    setLoading(true);
    setError("");
    setReservations([]);
    setDrinkOrders([]);

    const qs = new URLSearchParams(filter.params).toString();
    const url =
      filter.kind === "reservations"
        ? `/api/reservations${qs ? `?${qs}` : ""}`
        : `/api/service-orders${qs ? `?${qs}` : ""}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("error");
        return res.json();
      })
      .then((data: unknown) => {
        if (filter.kind === "reservations") {
          setReservations(Array.isArray(data) ? (data as ReservationRecord[]) : []);
        } else {
          const payload = data as { orders?: DrinkOrderRecord[] } | DrinkOrderRecord[];
          setDrinkOrders(
            Array.isArray(payload)
              ? payload
              : ((payload as { orders?: DrinkOrderRecord[] }).orders ?? [])
          );
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t("Failed to load records."));
        setLoading(false);
      });
  }, [filter]);

  if (!filter) return null;

  const count =
    filter.kind === "reservations" ? reservations.length : drinkOrders.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">{filter.title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="py-10 text-center text-sm text-slate-500">{t("Loading...")}</p>
          )}
          {!loading && error && (
            <p className="py-10 text-center text-sm text-rose-600">{error}</p>
          )}
          {!loading && !error && filter.kind === "reservations" && (
            reservations.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">{t("No records found.")}</p>
            ) : (
              <ReservationTable records={reservations} t={t} language={language} />
            )
          )}
          {!loading && !error && filter.kind === "drinkOrders" && (
            drinkOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">{t("No records found.")}</p>
            ) : (
              <DrinkOrderTable records={drinkOrders} t={t} />
            )
          )}
        </div>

        {!loading && count > 0 && (
          <div className="border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
            {count} {t("records")}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function ReservationTable({
  records,
  t,
  language
}: {
  records: ReservationRecord[];
  t: (s: string) => string;
  language: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {(["Room", "Date", "Time", "Type", "Status", "Attendees"] as const).map((h) => (
              <th
                key={h}
                className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500 last:pr-0"
              >
                {t(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="py-3 pr-6 font-medium text-slate-900">{r.room.name}</td>
              <td className="py-3 pr-6 text-slate-600">
                {fmtDate(r.reservationDate.toString(), language)}
              </td>
              <td className="py-3 pr-6 whitespace-nowrap text-slate-600">
                {r.startTime} – {r.endTime}
              </td>
              <td className="py-3 pr-6 text-slate-600">
                {t(r.reservationType || r.eventType || "—")}
              </td>
              <td className="py-3 pr-6">
                <StatusBadge status={r.bookingStatus} t={t} />
              </td>
              <td className="py-3 text-slate-600">{r.attendeesCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrinkOrderTable({
  records,
  t
}: {
  records: DrinkOrderRecord[];
  t: (s: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {(["Room", "Item", "Modifiers", "Status", "Submitted"] as const).map((h) => (
              <th
                key={h}
                className="pb-3 pr-6 text-left text-xs font-medium uppercase tracking-[0.12em] text-slate-500 last:pr-0"
              >
                {t(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50">
              <td className="py-3 pr-6 font-medium text-slate-900">{order.room.name}</td>
              <td className="py-3 pr-6 text-slate-600">{order.itemNameSnapshot}</td>
              <td className="py-3 pr-6 text-slate-600">{order.modifierSummary || "—"}</td>
              <td className="py-3 pr-6">
                <DrinkStatusBadge status={order.status} t={t} />
              </td>
              <td className="py-3 text-slate-500">{fmtDateTime(order.submittedAt.toString())}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: (s: string) => string }) {
  const cls: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.1em] ${cls[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {t(status)}
    </span>
  );
}

function DrinkStatusBadge({ status, t }: { status: string; t: (s: string) => string }) {
  const cls: Record<string, string> = {
    NEW: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    PREPARING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    SERVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-[0.1em] ${cls[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {t(status)}
    </span>
  );
}

function fmtDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function fmtDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
