"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, MapPin, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { useLanguage } from "@/components/providers/language-provider";
import { Card } from "@/components/ui/card";

type AgendaItem = {
  id: string;
  startTime: string;
  endTime: string;
  meetingTitle: string;
  roomName: string;
  roomLocation: string;
};

export function ReceptionAgendaPage({
  siteTitle,
  items
}: {
  siteTitle: string;
  items: AgendaItem[];
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const { language, t } = useLanguage();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      router.refresh();
    }, 60000);

    return () => window.clearInterval(refreshInterval);
  }, [router]);

  const locale = language === "ar" ? arSA : enUS;
  const todayLabel = format(now, "EEEE, dd MMMM yyyy", { locale });
  const timeLabel = format(now, "hh:mm a", { locale });

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-[1680px] space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-[#a9bce9] bg-[linear-gradient(135deg,#0f1847_0%,#1a3eaa_52%,#6f95ff_128%)] px-8 py-10 text-white shadow-[0_28px_60px_-36px_rgba(15,24,71,0.92)] lg:px-12 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">{t("Reception display")}</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-6xl">{t("Today's agenda")}</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/80">
                {t("Welcome to")} {siteTitle}. {t("Today's confirmed meetings are listed below so visitors can quickly find the correct room.")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-white/78">
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("Date")}</span>
                </div>
                <p className="mt-4 text-2xl font-semibold">{todayLabel}</p>
              </div>

              <div className="rounded-[28px] border border-white/14 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-white/78">
                  <Clock3 className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("Current time")}</span>
                </div>
                <p className="mt-4 text-2xl font-semibold">{timeLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("Visitor agenda")}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t("Meeting schedule")}</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                <Sparkles className="h-4 w-4" />
                {t("Confirmed bookings only")}
              </div>
            </div>

            {items.length > 0 ? (
              <div className="divide-y divide-[var(--line)]">
                {items.map((item) => {
                  return (
                    <div key={item.id} className="grid gap-4 py-5 lg:grid-cols-[150px_minmax(0,1fr)_260px] lg:items-center">
                      <div className="px-1 lg:px-2">
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {item.startTime}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{item.endTime}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xl font-bold text-slate-950">{item.meetingTitle}</p>
                      </div>

                      <div className="flex flex-col items-start gap-2 lg:items-end">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 ring-1 ring-[var(--line)]">
                          <MapPin className="h-4 w-4 text-[var(--accent)]" />
                          {item.roomName}
                        </span>
                        <p className="text-sm text-slate-500">{item.roomLocation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12">
                <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-slate-50 px-6 py-10 text-center">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("Today's agenda")}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-950">{t("No meetings scheduled today")}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {t("Reception can keep this screen open. Confirmed meetings will appear here as soon as they are scheduled for today.")}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
