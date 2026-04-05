"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RoomStatus } from "@prisma/client";
import { RoomForm } from "@/components/rooms/room-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RoomRecord } from "@/lib/types";
import { useSession } from "@/components/providers/session-provider";
import { StatePanel } from "@/components/ui/state-panel";

export function RoomsPage({ rooms }: { rooms: RoomRecord[] }) {
  const router = useRouter();
  const { user } = useSession();
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => a.code.localeCompare(b.code)), [rooms]);

  if (user?.role !== "ADMIN") {
    return <StatePanel title="Admin access required" message="Only admin users can manage the room master list." />;
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="flex justify-end">
        <Button onClick={() => {
          setEditingRoom(null);
          setShowCreate((current) => !current);
        }}>
          {showCreate ? "Hide form" : "Add room"}
        </Button>
      </div>

      {showCreate ? <RoomForm onSaved={() => router.refresh()} /> : null}
      {editingRoom ? <RoomForm room={editingRoom} onSaved={() => router.refresh()} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {sortedRooms.map((room) => (
          <Card key={room.id} className="rounded-[24px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{room.code}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{room.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {room.type} | {room.location}
                </p>
              </div>
              <Badge label={room.status} tone={room.status === RoomStatus.ACTIVE ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-200 text-slate-700 ring-slate-300"} />
            </div>
            <p className="mt-4 text-sm text-slate-600">Capacity: {room.capacity}</p>
            <p className="mt-2 text-sm text-slate-500">{room.notes || "No notes"}</p>
            <div className="mt-5">
              <Button variant="ghost" onClick={() => {
                setShowCreate(false);
                setEditingRoom(room);
              }}>
                Edit room
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
