"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DrinkOrderStatus } from "@prisma/client";
import { Clock3 } from "lucide-react";
import type { DrinkOrderRecord, MenuItemRecord, RoomServiceTokenRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatePanel } from "@/components/ui/state-panel";
import { useLanguage } from "@/components/providers/language-provider";
import { parseStoredAttachments, serializeSingleStoredAttachment, type StoredAttachment } from "@/lib/attachments";
import { readErrorMessage } from "@/lib/client-errors";

type TodayMeetingRecord = {
  id: string;
  startTime: string;
  endTime: string;
  meetingTitle: string;
  roomName: string;
  roomLocation: string;
  reservationDate: string;
  reservationEndDate: string;
};

type MenuFormState = {
  id?: string;
  name: string;
  category: string;
  description: string;
  imageAttachment: string;
  isActive: boolean;
  isOutOfStock: boolean;
  allowCustomNote: boolean;
  sortOrder: number;
  modifiers: string;
};

function defaultMenuForm(): MenuFormState {
  return {
    name: "",
    category: "Hot Drinks",
    description: "",
    imageAttachment: "",
    isActive: true,
    isOutOfStock: false,
    allowCustomNote: true,
    sortOrder: 0,
    modifiers: "No sugar, Extra sugar, Diet sugar"
  };
}

function toMenuFormState(item?: MenuItemRecord | null): MenuFormState {
  if (!item) {
    return defaultMenuForm();
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description ?? "",
    imageAttachment: item.imageAttachment ?? "",
    isActive: item.isActive,
    isOutOfStock: item.isOutOfStock,
    allowCustomNote: item.allowCustomNote,
    sortOrder: item.sortOrder,
    modifiers: item.modifiers.map((modifier) => modifier.label).join(", ")
  };
}

export function HospitalityAdminPage({
  roomTokens,
  initialMenuItems,
  todayMeetings,
  initialCurrentOrders
}: {
  roomTokens: RoomServiceTokenRecord[];
  initialMenuItems: MenuItemRecord[];
  todayMeetings: TodayMeetingRecord[];
  initialCurrentOrders: DrinkOrderRecord[];
}) {
  const { t } = useLanguage();
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [currentOrders, setCurrentOrders] = useState(initialCurrentOrders);
  const [form, setForm] = useState<MenuFormState>(defaultMenuForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    async function loadCurrentOrders() {
      try {
        const response = await fetch("/api/service-orders", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          orders: DrinkOrderRecord[];
        };

        setCurrentOrders(payload.orders);
      } catch {
        return;
      }
    }

    const interval = window.setInterval(() => {
      void loadCurrentOrders();
    }, 20000);

    return () => window.clearInterval(interval);
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(menuItems.map((item) => item.category))).concat(["Hot Drinks", "Tea", "Cold Drinks", "Water"]),
    [menuItems]
  );

  const sortedMenuItems = useMemo(
    () => [...menuItems].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [menuItems]
  );
  const groupedCurrentOrders = useMemo(() => {
    const groups = new Map<string, DrinkOrderRecord[]>();
    for (const order of currentOrders) {
      const key = order.room.name;
      groups.set(key, [...(groups.get(key) ?? []), order]);
    }

    return Array.from(groups.entries())
      .map(([roomName, orders]) => [
        roomName,
        [...orders].sort((left, right) => {
          const leftReminder = left.guestReminderRequestedAt ? 1 : 0;
          const rightReminder = right.guestReminderRequestedAt ? 1 : 0;
          if (leftReminder !== rightReminder) {
            return rightReminder - leftReminder;
          }
          return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
        })
      ] as const)
      .sort((left, right) => left[0].localeCompare(right[0]));
  }, [currentOrders]);

  async function handleSaveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    let imageAttachment = form.imageAttachment;

    if (selectedImageFile) {
      const formData = new FormData();
      formData.append("kind", "drink-image");
      formData.append("files", selectedImageFile);

      const uploadResponse = await fetch("/api/uploads", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        setError(await readErrorMessage(uploadResponse, t("Unable to upload files.")));
        setSaving(false);
        return;
      }

      const uploadPayload = (await uploadResponse.json()) as { files?: StoredAttachment[] };
      imageAttachment = serializeSingleStoredAttachment(uploadPayload.files?.[0]);
    }

    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      imageAttachment,
      isActive: form.isActive,
      isOutOfStock: form.isOutOfStock,
      allowCustomNote: form.allowCustomNote,
      sortOrder: editingItemId ? Number(form.sortOrder) : getNextSortOrder(menuItems),
      modifiers: form.modifiers
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((label, index) => ({
          label,
          isActive: true,
          sortOrder: index
        }))
    };

    try {
      const response = await fetch(editingItemId ? `/api/menu-items/${editingItemId}` : "/api/menu-items", {
        method: editingItemId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, t("Unable to save menu item.")));
        setSaving(false);
        return;
      }

      const item = (await response.json()) as MenuItemRecord;
      setMenuItems((current) =>
        (editingItemId
          ? current.map((entry) => (entry.id === item.id ? item : entry))
          : [...current, item]
        ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      );
      setForm(defaultMenuForm());
      setSelectedImageFile(null);
      setEditingItemId(null);
      setMessage(t(editingItemId ? "Menu item updated." : "Menu item added successfully."));
      setSaving(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("Unable to save menu item."));
      setSaving(false);
    }
  }

  async function toggleItem(item: MenuItemRecord, field: "isActive" | "isOutOfStock") {
    setError("");
    setMessage("");

    const response = await fetch(`/api/menu-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.name,
        nameArabic: item.nameArabic ?? "",
        category: item.category,
        description: item.description ?? "",
        descriptionArabic: item.descriptionArabic ?? "",
        imageAttachment: item.imageAttachment ?? "",
        isActive: field === "isActive" ? !item.isActive : item.isActive,
        isOutOfStock: field === "isOutOfStock" ? !item.isOutOfStock : item.isOutOfStock,
        allowCustomNote: item.allowCustomNote,
        sortOrder: item.sortOrder,
        [field]: !item[field],
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          label: modifier.label,
          labelArabic: modifier.labelArabic ?? "",
          isActive: modifier.isActive,
          sortOrder: modifier.sortOrder
        }))
      })
    });

    if (!response.ok) {
      setError(await readErrorMessage(response, t("Unable to update menu item.")));
      return;
    }

    const updated = (await response.json()) as MenuItemRecord;
    setMenuItems((current) =>
      current
        .map((entry) => (entry.id === updated.id ? updated : entry))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    );
    setMessage(t("Menu item updated."));
  }

  async function moveItem(itemId: string, direction: "up" | "down") {
    const index = sortedMenuItems.findIndex((item) => item.id === itemId);
    if (index === -1) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedMenuItems.length) {
      return;
    }

    const currentItem = sortedMenuItems[index];
    const swapItem = sortedMenuItems[targetIndex];

    setError("");
    setMessage("");

    const currentPayload = buildMenuItemPayload(currentItem, swapItem.sortOrder);
    const swapPayload = buildMenuItemPayload(swapItem, currentItem.sortOrder);

    const currentResponse = await fetch(`/api/menu-items/${currentItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentPayload)
    });

    if (!currentResponse.ok) {
      setError(await readErrorMessage(currentResponse, t("Unable to update menu item.")));
      return;
    }

    const swapResponse = await fetch(`/api/menu-items/${swapItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swapPayload)
    });

    if (!swapResponse.ok) {
      setError(await readErrorMessage(swapResponse, t("Unable to update menu item.")));
      return;
    }

    const updatedCurrent = (await currentResponse.json()) as MenuItemRecord;
    const updatedSwap = (await swapResponse.json()) as MenuItemRecord;

    setMenuItems((current) =>
      current
        .map((entry) => {
          if (entry.id === updatedCurrent.id) {
            return updatedCurrent;
          }
          if (entry.id === updatedSwap.id) {
            return updatedSwap;
          }
          return entry;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    );
    setMessage(t("Menu order updated."));
  }

  function startEditing(item: MenuItemRecord) {
    setForm(toMenuFormState(item));
    setEditingItemId(item.id);
    setSelectedImageFile(null);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setForm(defaultMenuForm());
    setEditingItemId(null);
    setSelectedImageFile(null);
    setError("");
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{t("Current drink requests")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("Monitor today's hospitality demand across all rooms from the admin side.")}</p>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)] ring-1 ring-[var(--line)]">
            {currentOrders.length} {t("orders")}
          </span>
        </div>
        <div className="mt-4">
          {groupedCurrentOrders.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {groupedCurrentOrders.map(([roomName, orders]) => (
                <div key={roomName} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{roomName}</p>
                      <p className="mt-1 text-sm text-slate-500">{orders[0]?.room.location}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600 ring-1 ring-[var(--line)]">
                      {orders.length} {t("orders")}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-[var(--line)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{formatOrderSummary(order)}</p>
                            <p className="mt-1 text-sm text-slate-500">{order.reservation?.guestCompany || t("Active meeting")}</p>
                          </div>
                          <DrinkOrderStatusBadge status={order.status} t={t} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {new Date(order.submittedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                          {order.guestLabel ? <span>{order.guestLabel}</span> : null}
                          {order.guestReminderRequestedAt ? <ReminderBadge t={t} /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StatePanel
              title={t("No live drink orders")}
              message={t("Today's drink requests will appear here automatically as guests submit hospitality orders.")}
            />
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{t("Today's meetings")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("Track which meetings are upcoming, currently running, or already finished.")}</p>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent)] ring-1 ring-[var(--line)]">
            {todayMeetings.length} {t("meetings")}
          </span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {todayMeetings.length ? (
            todayMeetings.map((meeting) => {
              const status = getMeetingTimingStatus(meeting);
              return (
                <div key={meeting.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{meeting.meetingTitle}</p>
                      <p className="mt-1 text-sm text-slate-600">{meeting.roomName}</p>
                      <p className="mt-1 text-sm text-slate-500">{meeting.roomLocation}</p>
                    </div>
                    <MeetingStatusBadge status={status} t={t} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span>{meeting.startTime}</span>
                    <span>{meeting.endTime}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-slate-50 p-6 text-sm text-slate-500">
              {t("No meetings scheduled today")}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h3 className="text-lg font-semibold text-slate-950">{t("Fixed room QR cards")}</h3>
          <p className="mt-1 text-sm text-slate-500">{t("Print one QR per room and keep it on the meeting tables.")}</p>
          <div className="mt-4 grid gap-4">
            {roomTokens.map((token) => {
              const guestUrl = `${origin}/guest-order/${token.token}`;
              const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(guestUrl)}`;
              return (
                <div key={token.id} className="rounded-[22px] border border-[var(--line)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{token.room?.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{token.room?.location}</p>
                      <p className="mt-3 break-all text-xs text-slate-500">{guestUrl}</p>
                    </div>
                    {origin ? (
                      <Image
                        src={qrImage}
                        alt={token.room?.name ?? "Room QR"}
                        width={108}
                        height={108}
                        unoptimized
                        className="rounded-xl bg-white p-2 ring-1 ring-[var(--line)]"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-950">{t("Beverage menu")}</h3>
          <p className="mt-1 text-sm text-slate-500">{t("Control what guests can order, what is out of stock, and which modifiers are available.")}</p>

          <form className="mt-4 grid gap-4 lg:grid-cols-2" onSubmit={handleSaveItem}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Item name")}</label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Category")}</label>
              <Input
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="Hot Drinks"
              />
              <p className="mt-2 text-xs text-slate-500">
                {t("Suggested categories")}: {categories.join(", ")}
              </p>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Description")}</label>
              <Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Drink image")}</label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.bmp,.tif,.tiff,.avif,.heic,image/*"
                onChange={(event) => setSelectedImageFile(event.target.files?.[0] ?? null)}
              />
              <p className="mt-2 text-xs text-slate-500">{t("Upload one menu-style image for this drink.")}</p>
              {selectedImageFile ? <p className="mt-2 text-xs text-slate-500">{selectedImageFile.name}</p> : null}
              {!selectedImageFile && parseStoredAttachments(form.imageAttachment)[0]?.name ? (
                <p className="mt-2 text-xs text-slate-500">{parseStoredAttachments(form.imageAttachment)[0]?.name}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Menu position")}</label>
              <div className="rounded-[18px] border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {editingItemId
                  ? t("Use Move up and Move down from the menu list to reorder this item.")
                  : t("New drinks are added automatically to the end of the menu.")}
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Modifiers")}</label>
              <Input value={form.modifiers} onChange={(event) => setForm({ ...form, modifiers: event.target.value })} placeholder="No sugar, Extra sugar, Diet sugar" />
            </div>
            <div className="lg:col-span-2 grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-[18px] border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                {t("Visible to guests")}
              </label>
              <label className="flex items-center gap-2 rounded-[18px] border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={form.isOutOfStock} onChange={(event) => setForm({ ...form, isOutOfStock: event.target.checked })} />
                {t("Out of stock")}
              </label>
              <label className="flex items-center gap-2 rounded-[18px] border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={form.allowCustomNote} onChange={(event) => setForm({ ...form, allowCustomNote: event.target.checked })} />
                {t("Allow custom note")}
              </label>
            </div>
            {error ? <div className="lg:col-span-2 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {message ? <div className="lg:col-span-2 rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
            <div className="lg:col-span-2 flex justify-end gap-3">
              {editingItemId ? (
                <Button type="button" variant="ghost" onClick={cancelEditing}>
                  {t("Cancel")}
                </Button>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? t("Saving...") : t(editingItemId ? "Save changes" : "Add menu item")}
              </Button>
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {sortedMenuItems.map((item, index) => (
              <div key={item.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    {parseStoredAttachments(item.imageAttachment)[0]?.url ? (
                      <Image
                        src={parseStoredAttachments(item.imageAttachment)[0]!.url}
                        alt={item.name}
                        width={72}
                        height={72}
                        unoptimized
                        className="h-[72px] w-[72px] rounded-2xl object-cover ring-1 ring-[var(--line)]"
                      />
                    ) : (
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white text-[10px] uppercase tracking-[0.16em] text-slate-400 ring-1 ring-[var(--line)]">
                        {t("No image")}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.category}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                        {t("Position")} {index + 1}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {item.modifiers.map((modifier) => modifier.label).join(", ") || t("No modifiers configured")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" disabled={index === 0} onClick={() => void moveItem(item.id, "up")}>
                      {t("Move up")}
                    </Button>
                    <Button variant="ghost" disabled={index === sortedMenuItems.length - 1} onClick={() => void moveItem(item.id, "down")}>
                      {t("Move down")}
                    </Button>
                    <Button variant="ghost" onClick={() => startEditing(item)}>
                      {t("Edit")}
                    </Button>
                    <Button variant="ghost" onClick={() => void toggleItem(item, "isOutOfStock")}>
                      {item.isOutOfStock ? t("Mark in stock") : t("Mark out of stock")}
                    </Button>
                    <Button variant="secondary" onClick={() => void toggleItem(item, "isActive")}>
                      {item.isActive ? t("Hide item") : t("Show item")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function getNextSortOrder(menuItems: MenuItemRecord[]) {
  return menuItems.length ? Math.max(...menuItems.map((item) => item.sortOrder)) + 1 : 0;
}

function buildMenuItemPayload(item: MenuItemRecord, sortOrder: number) {
  return {
    name: item.name,
    nameArabic: item.nameArabic ?? "",
    category: item.category,
    description: item.description ?? "",
    descriptionArabic: item.descriptionArabic ?? "",
    imageAttachment: item.imageAttachment ?? "",
    isActive: item.isActive,
    isOutOfStock: item.isOutOfStock,
    allowCustomNote: item.allowCustomNote,
    sortOrder,
    modifiers: item.modifiers.map((modifier) => ({
      id: modifier.id,
      label: modifier.label,
      labelArabic: modifier.labelArabic ?? "",
      isActive: modifier.isActive,
      sortOrder: modifier.sortOrder
    }))
  };
}

function getMeetingTimingStatus(meeting: TodayMeetingRecord) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinutes(meeting.startTime);
  const endMinutes = toMinutes(meeting.endTime);

  if (currentMinutes < startMinutes) {
    return "upcoming" as const;
  }

  if (currentMinutes > endMinutes) {
    return "finished" as const;
  }

  return "current" as const;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function MeetingStatusBadge({
  status,
  t
}: {
  status: "upcoming" | "current" | "finished";
  t: (text: string) => string;
}) {
  if (status === "current") {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">{t("Current")}</span>;
  }

  if (status === "finished") {
    return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">{t("Finished")}</span>;
  }

  return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">{t("Upcoming")}</span>;
}

function formatOrderSummary(order: DrinkOrderRecord) {
  const parts = [order.itemNameSnapshot];

  if (order.modifierSummary) {
    parts.push(order.modifierSummary);
  }

  if (order.customNote) {
    parts.push(order.customNote);
  }

  return parts.join(" - ");
}

function DrinkOrderStatusBadge({
  status,
  t
}: {
  status: DrinkOrderStatus;
  t: (text: string) => string;
}) {
  if (status === DrinkOrderStatus.SERVED) {
    return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">{t("Served")}</span>;
  }

  if (status === DrinkOrderStatus.PREPARING) {
    return <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-200">{t("Preparing")}</span>;
  }

  return <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">{t("New")}</span>;
}

function ReminderBadge({ t }: { t: (text: string) => string }) {
  return <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700 ring-1 ring-rose-200">{t("Reminder received")}</span>;
}
