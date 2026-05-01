"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  meta,
  icon,
  tone = "default"
}: {
  label: string;
  value: string | number;
  meta?: string;
  icon?: ReactNode;
  tone?: "default" | "accent" | "warning" | "soft";
}) {
  const { t } = useLanguage();

  return (
    <Card
      className={[
        "kpi-card",
        tone === "accent" ? "kpi-card--accent" : "",
        tone === "warning" ? "kpi-card--warning" : "",
        tone === "soft" ? "kpi-card--soft" : "",
        tone === "accent"
          ? "!bg-[var(--accent)] text-white"
          : tone === "warning"
            ? "!bg-[rgba(245,158,11,0.14)]"
            : tone === "soft"
              ? "!bg-[var(--accent-soft)]"
              : ""
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`kpi-card-label ${tone === "accent" ? "text-sm text-white/72" : "text-sm text-[var(--muted)]"}`}>{t(label)}</p>
          <p className={`kpi-card-value ${tone === "accent" ? "mt-3 text-3xl font-semibold tracking-tight text-white" : "mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)]"}`}>
            {value}
          </p>
          {meta ? <p className={`kpi-card-meta ${tone === "accent" ? "mt-2 text-sm text-white/72" : "mt-2 text-sm text-[var(--muted)]"}`}>{t(meta)}</p> : null}
        </div>
        {icon ? (
          <div
            className={
              tone === "accent"
                ? "kpi-card-icon rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/10"
                : "kpi-card-icon rounded-2xl bg-[var(--panel-elevated)] p-3 text-[var(--accent)] ring-1 ring-[var(--line)]"
            }
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
