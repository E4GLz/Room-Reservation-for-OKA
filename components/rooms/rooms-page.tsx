"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RoomStatus } from "@prisma/client";
import { RoomForm } from "@/components/rooms/room-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RoomRecord } from "@/lib/types";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { StatePanel } from "@/components/ui/state-panel";

export function RoomsPage({ rooms }: { rooms: RoomRecord[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useSession();
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const formAnchorRef = useRef<HTMLDivElement | null>(null);

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === RoomStatus.ACTIVE ? -1 : 1;
        }

        return a.code.localeCompare(b.code);
      }),
    [rooms]
  );

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!showCreate && !editingRoom) {
      return;
    }

    formAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, [editingRoom, showCreate]);

  function handleSaved(action: "added" | "updated") {
    setShowCreate(false);
    setEditingRoom(null);
    setSuccessMessage(action === "added" ? t("Room added successfully.") : t("Room updated successfully."));
    router.refresh();
  }

  if (user?.role !== "ADMIN") {
    return <StatePanel title={t("Admin access required")} message={t("Only admin users can manage the room master list.")} />;
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="flex justify-end">
        <Button className="dark-mode-white-button" onClick={() => {
          setEditingRoom(null);
          setShowCreate((current) => !current);
        }}>
          {showCreate ? t("Hide form") : t("Add room")}
        </Button>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div ref={formAnchorRef} />
      {showCreate ? <RoomForm key="create-room" onSaved={handleSaved} /> : null}
      {editingRoom ? <RoomForm key={editingRoom.id} room={editingRoom} onSaved={handleSaved} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {sortedRooms.map((room) => (
          <Card key={room.id} className="rounded-[24px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{room.code}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{room.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t(room.type)} | {room.location}
                </p>
              </div>
              <Badge label={room.status} tone={room.status === RoomStatus.ACTIVE ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-200 text-slate-700 ring-slate-300"} />
            </div>
            <p className="mt-4 text-sm text-slate-600">{t("Capacity")}: {room.capacity}</p>
            <p className="mt-2 text-sm text-slate-500">{room.notes || t("No notes")}</p>
            <div className="mt-5">
              <Button variant="ghost" onClick={() => {
                setShowCreate(false);
                setEditingRoom(room);
              }}>
                {t("Edit room")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
