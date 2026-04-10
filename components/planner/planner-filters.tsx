"use client";

import type { FilterState, RoomRecord } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RESERVATION_TYPES } from "@/lib/constants";
import { useLanguage } from "@/components/providers/language-provider";

export function PlannerFilters({
  rooms,
  filters,
  onChange
}: {
  rooms: RoomRecord[];
  filters: FilterState;
  onChange: (next: FilterState) => void
}) {
  const { t } = useLanguage();

  return (
    <div className="grid gap-3 rounded-[26px] border border-[var(--line)] bg-[rgba(255,255,255,0.86)] p-4 backdrop-blur-sm lg:grid-cols-4">
      <Select value={filters.roomId} onChange={(event) => onChange({ ...filters, roomId: event.target.value })}>
        <option value="">{t("All rooms")}</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.code} - {room.name}
          </option>
        ))}
      </Select>

      <Select value={filters.eventType} onChange={(event) => onChange({ ...filters, eventType: event.target.value })}>
        <option value="">{t("All reservation types")}</option>
        {RESERVATION_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(type)}
          </option>
        ))}
      </Select>

      <Select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as FilterState["status"] })}>
        <option value="">{t("All statuses")}</option>
        <option value="PENDING">{t("Pending")}</option>
        <option value="CONFIRMED">{t("Confirmed")}</option>
        <option value="CANCELLED">{t("Cancelled")}</option>
      </Select>

      <Input
        placeholder={t("Search guest company or charged department")}
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
      />
    </div>
  );
}
