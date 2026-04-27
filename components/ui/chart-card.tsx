"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { Card } from "@/components/ui/card";

export function ChartCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
        <h3 className="text-lg font-semibold text-[var(--ink)]">{t(title)}</h3>
        {description ? <p className="mt-1 text-sm text-[var(--muted)]">{t(description)}</p> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}
