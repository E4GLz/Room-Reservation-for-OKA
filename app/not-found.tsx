"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-lg rounded-[28px] border border-slate-200 bg-white px-8 py-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("Not found")}</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">{t("The requested booking or page does not exist.")}</h2>
        <p className="mt-3 text-sm text-slate-600">{t("Use the planner to navigate back into the reservation schedule.")}</p>
        <div className="mt-6">
          <Link href="/planner">
            <Button>{t("Back to planner")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
