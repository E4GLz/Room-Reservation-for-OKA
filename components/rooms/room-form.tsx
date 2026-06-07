"use client";

import { useEffect, useState } from "react";
import { RoomStatus } from "@prisma/client";
import { ROOM_TYPES } from "@/lib/constants";
import type { RoomFormValues, RoomRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/providers/language-provider";
import { RoomLayoutEditor } from "@/components/rooms/room-layout-editor";
import { createEmptyRoomLayout, parseRoomLayout, serializeRoomLayout, type RoomLayoutConfig } from "@/lib/room-layout";

function initialValues(room?: RoomRecord | null): RoomFormValues {
  return {
    code: room?.code ?? "",
    name: room?.name ?? "",
    type: room?.type ?? ROOM_TYPES[0],
    capacity: room?.capacity ?? 10,
    location: room?.location ?? "",
    notes: room?.notes ?? "",
    seatLayoutConfig: room?.seatLayoutConfig ?? "",
    status: room?.status ?? RoomStatus.ACTIVE
  };
}

export function RoomForm({
  room,
  onSaved
}: {
  room?: RoomRecord | null;
  onSaved?: (action: "added" | "updated") => void;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<RoomFormValues>(() => initialValues(room));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<RoomLayoutConfig>(() => createEmptyRoomLayout());

  useEffect(() => {
    setForm(initialValues(room));
    setError("");
    setSaving(false);
    setLayout(parseRoomLayout(room?.seatLayoutConfig ?? "", room?.capacity ?? 10));
  }, [room]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(room ? `/api/rooms/${room.id}` : "/api/rooms", {
        method: room ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          seatLayoutConfig: serializeRoomLayout(layout)
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        let message = t("Unable to save room.");

        if (contentType.includes("application/json")) {
          const payload = await response.json();
          message = payload.error?.formErrors?.[0] || payload.error || message;
        } else {
          const text = await response.text();
          if (text.trim()) {
            message = text;
          }
        }

        setError(message);
        setSaving(false);
        return;
      }

      setSaving(false);
      onSaved?.(room ? "updated" : "added");
    } catch (error) {
      setError(error instanceof Error ? error.message : t("Unable to save room."));
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-[28px] p-6">
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Room code")}</label>
          <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Room name")}</label>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Room type")}</label>
          <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(type)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Capacity")}</label>
          <Input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Location / floor")}</label>
          <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Status")}</label>
          <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RoomStatus })}>
            <option value={RoomStatus.ACTIVE}>{t("Active")}</option>
            <option value={RoomStatus.INACTIVE}>{t("Inactive")}</option>
          </Select>
        </div>
        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Notes")}</label>
          <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>
        <div className="lg:col-span-2 rounded-[24px] border border-[var(--line)] bg-slate-50 p-5">
          <p className="mb-3 text-sm font-medium text-slate-700">{t("Room layout editor")}</p>
          <RoomLayoutEditor layout={layout} onChange={setLayout} />
        </div>
        {error ? <div className="lg:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving} className="dark-mode-white-button">
            {saving ? t("Saving...") : room ? t("Update room") : t("Add room")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
