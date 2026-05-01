"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Card } from "@/components/ui/card";

export default function Loading() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="space-y-3">
        <div className="skeleton-shimmer h-3 w-28 rounded-full" />
        <div className="skeleton-shimmer h-10 w-[22rem] max-w-full rounded-2xl" />
        <div className="skeleton-shimmer h-4 w-[34rem] max-w-full rounded-full" />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="space-y-4">
            <div className="skeleton-shimmer h-4 w-24 rounded-full" />
            <div className="skeleton-shimmer h-10 w-20 rounded-2xl" />
            <div className="skeleton-shimmer h-3 w-32 rounded-full" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="space-y-5">
          <div className="space-y-3">
            <div className="skeleton-shimmer h-5 w-40 rounded-full" />
            <div className="skeleton-shimmer h-3 w-56 rounded-full" />
          </div>
          <div className="skeleton-shimmer h-80 rounded-[24px]" />
        </Card>

        <Card className="space-y-4">
          <div className="space-y-3">
            <div className="skeleton-shimmer h-5 w-36 rounded-full" />
            <div className="skeleton-shimmer h-3 w-44 rounded-full" />
          </div>
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skeleton-shimmer h-14 rounded-[18px]" />
          ))}
        </Card>
      </div>

      <div className="sr-only">
        <p>{t("Loading")}</p>
        <p>{t("Preparing reservation workspace")}</p>
        <p>{t("Fetching rooms, bookings, and dashboard summaries.")}</p>
      </div>
    </div>
  );
}
