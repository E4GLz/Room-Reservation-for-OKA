"use client";

import { useLanguage } from "@/components/providers/language-provider";

export function StatePanel({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-soft)] px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-[var(--ink)]">{t(title)}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{t(message)}</p>
    </div>
  );
}
