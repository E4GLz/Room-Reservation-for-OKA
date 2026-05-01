"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DrinkOrderStatus } from "@prisma/client";
import { BellRing, CheckCircle2, CupSoda, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/providers/language-provider";
import { parseStoredAttachments } from "@/lib/attachments";
import { extractFlattenedFormError, readErrorMessage } from "@/lib/client-errors";
import type { DrinkOrderRecord, MenuItemRecord } from "@/lib/types";

type PendingDrink = {
  id: string;
  menuItemId: string;
  itemName: string;
  selectedModifierIds: string[];
  modifierSummary: string;
  customNote: string;
};

const REMINDER_DELAY_MINUTES = 15;

export function GuestOrderPage({
  token,
  room,
  reservation,
  menuItems
}: {
  token: string;
  room: { id: string; name: string; location: string };
  reservation: { id: string; meetingTitle: string; startTime: string; endTime: string } | null;
  menuItems: MenuItemRecord[];
}) {
  const { t } = useLanguage();
  const [selectedItemId, setSelectedItemId] = useState(menuItems.find((item) => !item.isOutOfStock)?.id ?? "");
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [guestLabel, setGuestLabel] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [pendingDrinks, setPendingDrinks] = useState<PendingDrink[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [trackingOrders, setTrackingOrders] = useState<DrinkOrderRecord[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  const selectedItem = useMemo(
    () => menuItems.find((item) => item.id === selectedItemId) ?? null,
    [menuItems, selectedItemId]
  );
  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isActive && !item.isOutOfStock),
    [menuItems]
  );
  const selectedModifierLabels = useMemo(() => {
    if (!selectedItem || selectedModifierIds.length === 0) {
      return "";
    }

    return selectedItem.modifiers
      .filter((modifier) => selectedModifierIds.includes(modifier.id))
      .map((modifier) => modifier.label)
      .join(", ");
  }, [selectedItem, selectedModifierIds]);

  useEffect(() => {
    if (trackingOrders.length === 0) {
      return;
    }

    async function refreshOrders() {
      try {
        const responses = await Promise.all(
          trackingOrders.map((order) =>
            fetch(`/api/guest-order/${token}/orders/${order.id}`, {
              cache: "no-store"
            })
          )
        );

        const failed = responses.find((response) => !response.ok);
        if (failed) {
          setTrackingError(await readErrorMessage(failed, t("Unable to track your request.")));
          return;
        }

        const payloads = (await Promise.all(
          responses.map((response) => response.json())
        )) as Array<{ order: DrinkOrderRecord }>;

        setTrackingOrders(payloads.map((payload) => payload.order));
        setNow(Date.now());
      } catch (refreshError) {
        setTrackingError(refreshError instanceof Error ? refreshError.message : t("Unable to track your request."));
      }
    }

    const interval = window.setInterval(() => {
      void refreshOrders();
    }, 12000);

    return () => window.clearInterval(interval);
  }, [t, token, trackingOrders]);

  const reminderEligibleOrders = useMemo(
    () =>
      trackingOrders.filter((order) => {
        if (order.status === DrinkOrderStatus.SERVED || order.status === DrinkOrderStatus.CANCELLED) {
          return false;
        }

        if (order.guestReminderRequestedAt) {
          return false;
        }

        return now - new Date(order.submittedAt).getTime() >= REMINDER_DELAY_MINUTES * 60_000;
      }),
    [now, trackingOrders]
  );
  const hasActiveReservation = Boolean(reservation);

  function addSelectedDrink() {
    if (!selectedItem) {
      return;
    }

    setPendingDrinks((current) => [
      ...current,
      {
        id: globalThis.crypto.randomUUID(),
        menuItemId: selectedItem.id,
        itemName: selectedItem.name,
        selectedModifierIds,
        modifierSummary: selectedModifierLabels,
        customNote
      }
    ]);
    setSelectedModifierIds([]);
    setCustomNote("");
    setMessage("");
    setError("");
  }

  function removePendingDrink(id: string) {
    setPendingDrinks((current) => current.filter((item) => item.id !== id));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setTrackingError("");

    const items = pendingDrinks.length
      ? pendingDrinks.map((item) => ({
          menuItemId: item.menuItemId,
          selectedModifierIds: item.selectedModifierIds,
          customNote: item.customNote
        }))
      : selectedItem
        ? [
            {
              menuItemId: selectedItem.id,
              selectedModifierIds,
              customNote
            }
          ]
        : [];

    if (items.length === 0) {
      setError(t("Please add at least one drink request."));
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/guest-order/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestLabel,
          items
        })
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, t("Unable to submit order."), extractFlattenedFormError));
        setSaving(false);
        return;
      }

      const payload = (await response.json()) as { orders: DrinkOrderRecord[] };
      setTrackingOrders(payload.orders);
      setPendingDrinks([]);
      setSelectedModifierIds([]);
      setCustomNote("");
      setMessage(t("Your drink request has been sent."));
      setReminderMessage("");
      setNow(Date.now());
      setSaving(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("Unable to submit order."));
      setSaving(false);
    }
  }

  async function handleSendReminder() {
    if (reminderEligibleOrders.length === 0) {
      return;
    }

    setReminderSending(true);
    setTrackingError("");

    try {
      const responses = await Promise.all(
        reminderEligibleOrders.map((order) =>
          fetch(`/api/guest-order/${token}/orders/${order.id}`, {
            method: "POST"
          })
        )
      );

      const failed = responses.find((response) => !response.ok);
      if (failed) {
        setTrackingError(await readErrorMessage(failed, t("Unable to send reminder.")));
        setReminderSending(false);
        return;
      }

      const payloads = (await Promise.all(responses.map((response) => response.json()))) as Array<{
        order: DrinkOrderRecord;
        message?: string;
      }>;
      const updatedMap = new Map(payloads.map((payload) => [payload.order.id, payload.order]));

      setTrackingOrders((current) => current.map((order) => updatedMap.get(order.id) ?? order));
      setReminderMessage(t("Reminder sent."));
      setReminderSending(false);
    } catch (reminderError) {
      setTrackingError(reminderError instanceof Error ? reminderError.message : t("Unable to send reminder."));
      setReminderSending(false);
    }
  }

  function resetRequestFlow() {
    setTrackingOrders([]);
    setPendingDrinks([]);
    setReminderMessage("");
    setTrackingError("");
    setMessage("");
    setError("");
    setGuestLabel("");
    setCustomNote("");
    setSelectedModifierIds([]);
    setSelectedItemId(menuItems.find((item) => !item.isOutOfStock)?.id ?? "");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(247,249,254,0.95),rgba(239,244,252,0.85))] px-4 py-5 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,#161d67_0%,#1f3ea0_52%,#6f95ff_130%)] px-5 py-6 text-white shadow-[0_28px_60px_-36px_rgba(16,23,67,0.9)] sm:px-6 sm:py-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">{t("Guest ordering")}</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{room.name}</h1>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/84 ring-1 ring-white/10">
                <MapPin className="h-4 w-4" />
                {room.location}
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/84">{t("Order drinks for this room.")}</p>
            </div>

            <div className="min-w-[220px] rounded-[24px] bg-white/10 px-5 py-5 ring-1 ring-white/12 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/68">
                {trackingOrders.length > 0 ? t("Order status") : t("Selected drinks")}
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                {trackingOrders.length > 0 ? trackingOrders.length : pendingDrinks.length}
              </p>
              <p className="mt-2 text-sm text-white/78">
                {trackingOrders.length > 0 ? t("Track your drinks below.") : t("Add tea, water, or more than one drink before submitting.")}
              </p>
            </div>
          </div>
        </section>

        <Card>
          {!hasActiveReservation ? (
            <div className="rounded-[22px] bg-slate-50 px-5 py-6 text-sm text-slate-600">
              {t("No active reservation is currently running in this room, so guest ordering is temporarily unavailable.")}
            </div>
          ) : trackingOrders.length > 0 ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">{t("Track your order")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t("Drink status")}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t("Your submitted drinks are listed below. Keep this page open to follow their status.")}</p>
                </div>
                {reminderMessage ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                    <BellRing className="h-3.5 w-3.5" />
                    {reminderMessage}
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                {trackingOrders.map((order) => (
                  <div key={order.id} className="rounded-[22px] border border-[var(--line)] bg-slate-50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{order.itemNameSnapshot}</p>
                        {order.modifierSummary ? <p className="mt-1 text-sm text-slate-500">{order.modifierSummary}</p> : null}
                        {order.customNote ? <p className="mt-1 text-sm text-slate-500">{order.customNote}</p> : null}
                      </div>
                      <GuestStatusBadge status={order.status} t={t} />
                    </div>
                  </div>
                ))}
              </div>

              {trackingError ? <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{trackingError}</div> : null}
              {message ? <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {reminderEligibleOrders.length > 0 ? (
                  <Button type="button" disabled={reminderSending} className="w-full justify-center sm:w-auto" onClick={() => void handleSendReminder()}>
                    {reminderSending ? t("Sending reminder...") : t("Remind service")}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" className="w-full justify-center sm:w-auto" onClick={resetRequestFlow}>
                  {t("Make another request")}
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">{t("Choose a drink")}</label>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                    <CupSoda className="h-3.5 w-3.5 text-amber-500" />
                    {availableMenuItems.length} {t("available")}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {menuItems.map((item) => {
                    const image = parseStoredAttachments(item.imageAttachment)[0];

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={item.isOutOfStock || !item.isActive}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setSelectedModifierIds([]);
                          setCustomNote("");
                        }}
                        className={`group overflow-hidden rounded-[24px] border text-left transition ${
                          selectedItemId === item.id
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_18px_42px_-28px_rgba(37,87,229,0.45)]"
                            : "border-[var(--line)] bg-white hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_18px_42px_-30px_rgba(15,23,42,0.22)]"
                        } ${item.isOutOfStock ? "opacity-55" : ""}`}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                          {image?.url ? (
                            <Image src={image.url} alt={item.name} fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                              {t("No image")}
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                              <p className="mt-1 text-sm text-slate-500">{item.category}</p>
                            </div>
                            {selectedItemId === item.id ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm">
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                            ) : null}
                          </div>
                          {item.description ? <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">{t("Your name or seat")}</label>
                    <Input value={guestLabel} onChange={(event) => setGuestLabel(event.target.value)} placeholder={t("Optional")} />
                  </div>

                  {selectedItem && selectedItem.modifiers.length > 0 ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">{t("Drink modifications")}</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedItem.modifiers.map((modifier) => (
                          <button
                            key={modifier.id}
                            type="button"
                            aria-pressed={selectedModifierIds.includes(modifier.id)}
                            onClick={() =>
                              setSelectedModifierIds((current) =>
                                current.includes(modifier.id)
                                  ? current.filter((id) => id !== modifier.id)
                                  : [...current, modifier.id]
                              )
                            }
                            className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left text-sm transition ${
                              selectedModifierIds.includes(modifier.id)
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_14px_28px_-22px_rgba(37,87,229,0.45)]"
                                : "border-[var(--line)] bg-slate-50 text-slate-700 hover:bg-white"
                            }`}
                          >
                            {modifier.label}
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                                selectedModifierIds.includes(modifier.id)
                                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                  : "border-slate-300 bg-white text-slate-400"
                              }`}
                            >
                              {selectedModifierIds.includes(modifier.id) ? "✓" : "+"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedItem?.allowCustomNote ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">{t("Special note")}</label>
                      <Textarea value={customNote} onChange={(event) => setCustomNote(event.target.value)} placeholder={t("Optional")} />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-[var(--line)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                          <CupSoda className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("Selected drinks")}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{pendingDrinks.length}</p>
                        </div>
                      </div>
                      <Button type="button" variant="secondary" onClick={addSelectedDrink}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("Add drink")}
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {pendingDrinks.length > 0 ? (
                        pendingDrinks.map((item) => (
                          <div key={item.id} className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-[var(--line)]">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">{item.itemName}</p>
                                {item.modifierSummary ? <p className="mt-1 text-sm text-slate-500">{item.modifierSummary}</p> : null}
                                {item.customNote ? <p className="mt-1 text-sm text-slate-500">{item.customNote}</p> : null}
                              </div>
                              <button type="button" onClick={() => removePendingDrink(item.id)} className="text-slate-400 transition hover:text-rose-600">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[18px] bg-white px-4 py-3 text-sm text-slate-500 ring-1 ring-[var(--line)]">
                          {t("Select a drink, choose any modifications, then add it to the request.")}
                        </div>
                      )}
                    </div>
                  </div>

                  {error ? <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                  {message ? <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

                  <div className="rounded-[24px] bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5 ring-1 ring-[var(--line)]">
                    <p className="text-sm leading-6 text-slate-600">{t("Submit one or more drinks together and track their status from the same screen.")}</p>
                    <div className="mt-4">
                      <Button type="submit" disabled={saving || (!selectedItemId && pendingDrinks.length === 0)} className="w-full justify-center">
                        {saving ? t("Sending request...") : t("Submit drink request")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}

function getGuestStatusLabel(status: DrinkOrderStatus) {
  if (status === DrinkOrderStatus.PREPARING) {
    return "Preparing";
  }

  if (status === DrinkOrderStatus.SERVED) {
    return "Delivered";
  }

  return "Request received";
}

function GuestStatusBadge({
  status,
  t
}: {
  status: DrinkOrderStatus;
  t: (text: string) => string;
}) {
  if (status === DrinkOrderStatus.SERVED) {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">{t("Delivered")}</span>;
  }

  if (status === DrinkOrderStatus.PREPARING) {
    return <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-200">{t("Preparing")}</span>;
  }

  return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">{t("Request received")}</span>;
}
