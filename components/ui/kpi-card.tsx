import type { ReactNode } from "react";
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
  return (
    <Card
      className={
        tone === "accent"
          ? "bg-[var(--accent)] text-white"
          : tone === "warning"
            ? "bg-[#fff3cf]"
            : tone === "soft"
              ? "bg-[#edf3ff]"
              : ""
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={tone === "accent" ? "text-sm text-white/72" : "text-sm text-slate-500"}>{label}</p>
          <p className={tone === "accent" ? "mt-3 text-3xl font-semibold tracking-tight text-white" : "mt-3 text-3xl font-semibold tracking-tight text-slate-950"}>
            {value}
          </p>
          {meta ? <p className={tone === "accent" ? "mt-2 text-sm text-white/72" : "mt-2 text-sm text-slate-500"}>{meta}</p> : null}
        </div>
        {icon ? (
          <div
            className={
              tone === "accent"
                ? "rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/10"
                : "rounded-2xl bg-white p-3 text-[var(--accent)] ring-1 ring-[var(--line)]"
            }
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
