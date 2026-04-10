"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-4 border-b border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,255,0.88))] px-8 py-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">{t(eyebrow)}</p>
        ) : null}
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 lg:text-[2.1rem]">{t(title)}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t(description)}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
