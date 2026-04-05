"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatePanel } from "@/components/ui/state-panel";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/providers/session-provider";
import { WEEKDAY_OPTIONS } from "@/lib/constants";
import type { AppSettingsRecord, SettingsFormValues } from "@/lib/types";

function mapInitialValues(settings: AppSettingsRecord): SettingsFormValues {
  return {
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
    workWeekStart: settings.workWeekStart,
    workWeekEnd: settings.workWeekEnd,
    upcomingReminderHours: settings.upcomingReminderHours,
    blockedDays: settings.blockedDays.map((day) => ({
      id: day.id,
      date: String(day.date).slice(0, 10),
      label: day.label,
      notes: day.notes ?? ""
    }))
  };
}

export function SettingsPage({ settings }: { settings: AppSettingsRecord }) {
  const { user } = useSession();
  const [form, setForm] = useState<SettingsFormValues>(() => mapInitialValues(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reminderOptions = [
    { value: 1, label: "1 hour before" },
    { value: 2, label: "2 hours before" },
    { value: 4, label: "4 hours before" },
    { value: 8, label: "8 hours before" },
    { value: 24, label: "1 day before" },
    { value: 48, label: "2 days before" }
  ];

  if (user?.role !== "ADMIN") {
    return <StatePanel title="Admin access required" message="Only admin users can update booking settings." />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.formErrors?.[0] || "Unable to save settings.");
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Website title</label>
              <Input value={form.siteTitle} onChange={(event) => setForm({ ...form, siteTitle: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Workweek start day</label>
              <Select
                value={String(form.workWeekStart)}
                onChange={(event) => setForm({ ...form, workWeekStart: Number(event.target.value) })}
              >
                {WEEKDAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Website description</label>
              <Textarea value={form.siteDescription} onChange={(event) => setForm({ ...form, siteDescription: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Workweek end day</label>
              <Select
                value={String(form.workWeekEnd)}
                onChange={(event) => setForm({ ...form, workWeekEnd: Number(event.target.value) })}
              >
                {WEEKDAY_OPTIONS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Upcoming meeting reminder</label>
              <Select
                value={String(form.upcomingReminderHours)}
                onChange={(event) => setForm({ ...form, upcomingReminderHours: Number(event.target.value) })}
              >
                {reminderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="mt-2 text-xs text-slate-500">
                Reminder emails are prepared for active admin accounts using this lead time.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Blocked booking days</h3>
                <p className="mt-1 text-sm text-slate-500">Use this list for national day, Eid, shutdown periods, or any days that should not accept bookings.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    blockedDays: [...current.blockedDays, { date: "", label: "", notes: "" }]
                  }))
                }
              >
                Add blocked day
              </Button>
            </div>

            {form.blockedDays.length === 0 ? (
              <StatePanel title="No blocked days" message="Bookings will be allowed on all dates until you add a blocked day." />
            ) : (
              form.blockedDays.map((blockedDay, index) => (
                <Card key={`${blockedDay.id ?? "new"}-${index}`} className="rounded-[22px] bg-slate-50">
                  <div className="grid gap-4 lg:grid-cols-[180px_1fr_1fr_auto]">
                    <Input
                      type="date"
                      value={blockedDay.date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          blockedDays: current.blockedDays.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, date: event.target.value } : entry
                          )
                        }))
                      }
                    />
                    <Input
                      placeholder="Day label"
                      value={blockedDay.label}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          blockedDays: current.blockedDays.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, label: event.target.value } : entry
                          )
                        }))
                      }
                    />
                    <Input
                      placeholder="Optional note"
                      value={blockedDay.notes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          blockedDays: current.blockedDays.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, notes: event.target.value } : entry
                          )
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          blockedDays: current.blockedDays.filter((_, entryIndex) => entryIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
