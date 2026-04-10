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

function initialValues(room?: RoomRecord | null): RoomFormValues {
  return {
    code: room?.code ?? "",
    name: room?.name ?? "",
    type: room?.type ?? ROOM_TYPES[0],
    capacity: room?.capacity ?? 10,
    location: room?.location ?? "",
    notes: room?.notes ?? "",
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
  const [form, setForm] = useState<RoomFormValues>(() => initialValues(room));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(initialValues(room));
    setError("");
    setSaving(false);
  }, [room]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(room ? `/api/rooms/${room.id}` : "/api/rooms", {
        method: room ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        let message = "Unable to save room.";

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
      setError(error instanceof Error ? error.message : "Unable to save room.");
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-[28px] p-6">
      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Room code</label>
          <Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Room name</label>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Room type</label>
          <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Capacity</label>
          <Input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Location / floor</label>
          <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
          <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RoomStatus })}>
            <option value={RoomStatus.ACTIVE}>Active</option>
            <option value={RoomStatus.INACTIVE}>Inactive</option>
          </Select>
        </div>
        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
          <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>
        {error ? <div className="lg:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : room ? "Update room" : "Add room"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
