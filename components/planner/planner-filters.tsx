import type { FilterState, RoomRecord } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RESERVATION_TYPES } from "@/lib/constants";

export function PlannerFilters({
  rooms,
  filters,
  onChange
}: {
  rooms: RoomRecord[];
  filters: FilterState;
  onChange: (next: FilterState) => void
}) {
  return (
    <div className="grid gap-3 rounded-[26px] border border-[var(--line)] bg-[rgba(255,255,255,0.86)] p-4 backdrop-blur-sm lg:grid-cols-4">
      <Select value={filters.roomId} onChange={(event) => onChange({ ...filters, roomId: event.target.value })}>
        <option value="">All rooms</option>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.code} - {room.name}
          </option>
        ))}
      </Select>

      <Select value={filters.eventType} onChange={(event) => onChange({ ...filters, eventType: event.target.value })}>
        <option value="">All reservation types</option>
        {RESERVATION_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </Select>

      <Select value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value as FilterState["status"] })}>
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="CANCELLED">Cancelled</option>
      </Select>

      <Input
        placeholder="Search guest company or charged department"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
      />
    </div>
  );
}
