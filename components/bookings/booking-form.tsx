"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingStatus, UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { ReservationInput, ReservationRecord, RoomRecord } from "@/lib/types";
import { RESERVATION_TYPES } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { toInputDate } from "@/lib/utils";

type FormState = Omit<ReservationInput, "foodServiceRequired"> & {
  foodServiceRequired: boolean | null;
};

function buildInitialState(
  rooms: RoomRecord[],
  reservation?: ReservationRecord | null,
  fallbackRole?: UserRole,
  fallbackName?: string,
  fallbackEmail?: string
): FormState {
  const defaultType = reservation?.reservationType ?? RESERVATION_TYPES[0];
  const firstMatchingRoom = rooms.find((room) => room.type === defaultType) ?? rooms[0];

  return {
    roomId: reservation?.roomId ?? firstMatchingRoom?.id ?? "",
    reservationDate: reservation ? reservation.reservationDate.slice(0, 10) : toInputDate(new Date()),
    reservationEndDate: reservation ? reservation.reservationEndDate.slice(0, 10) : toInputDate(new Date()),
    startTime: reservation?.startTime ?? "09:00",
    endTime: reservation?.endTime ?? "10:00",
    reservationType: defaultType,
    guestCompany: reservation?.guestCompany ?? "",
    guestName: reservation?.guestName ?? "",
    guestCompanyLogo: reservation?.guestCompanyLogo ?? "",
    chargedCompany: reservation?.chargedCompany ?? "",
    chargedDepartment: reservation?.chargedDepartment ?? "",
    materialsToDisplay: reservation?.materialsToDisplay ?? "",
    foodServiceRequired: reservation?.foodServiceRequired ?? null,
    foodServiceLocation: reservation?.foodServiceLocation ?? "",
    requesterName: reservation?.requesterName ?? fallbackName ?? "",
    requesterEmail: reservation?.requesterEmail ?? fallbackEmail ?? "",
    contactNumber: reservation?.contactNumber ?? "",
    attendeesCount: reservation?.attendeesCount ?? 1,
    remarks: reservation?.remarks ?? "",
    bookingStatus:
      reservation?.bookingStatus ??
      (fallbackRole === UserRole.ADMIN ? BookingStatus.CONFIRMED : BookingStatus.PENDING),
    createdByRole: reservation?.createdByRole ?? fallbackRole ?? UserRole.STANDARD,
    overrideCapacity: reservation?.overrideCapacity ?? false,
    cancellationNotes: reservation?.cancellationNotes ?? ""
  };
}

export function BookingForm({
  rooms,
  reservation,
  onSaved
}: {
  rooms: RoomRecord[];
  reservation?: ReservationRecord | null;
  onSaved?: (payload: { reservation: ReservationRecord; notification?: { message: string } }) => void;
}) {
  const router = useRouter();
  const { user } = useSession();
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(rooms, reservation, user?.role, user?.name, user?.email)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [conflicts, setConflicts] = useState<ReservationRecord[]>([]);

  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.type === form.reservationType),
    [form.reservationType, rooms]
  );

  useEffect(() => {
    if (!filteredRooms.some((room) => room.id === form.roomId)) {
      setForm((current) => ({
        ...current,
        roomId: filteredRooms[0]?.id ?? ""
      }));
    }
  }, [filteredRooms, form.roomId]);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === form.roomId), [form.roomId, rooms]);
  const adminManaged = user?.role === UserRole.ADMIN;

  function getErrorMessage(payload: unknown) {
    if (typeof payload === "string") {
      return payload;
    }

    if (payload && typeof payload === "object" && "fieldErrors" in payload) {
      const fieldErrors = (payload as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat().find((entry): entry is string => Boolean(entry))
        : undefined;

      if (firstFieldError) {
        return firstFieldError;
      }
    }

    if (payload && typeof payload === "object" && "formErrors" in payload) {
      const formErrors = (payload as { formErrors?: string[] }).formErrors;
      if (formErrors?.[0]) {
        return formErrors[0];
      }
    }

    return "Unable to save reservation.";
  }

  function handleSingleFileName(field: "guestCompanyLogo", files: FileList | null) {
    setForm((current) => ({
      ...current,
      [field]: files?.[0]?.name ?? ""
    }));
  }

  function handleMultiFileNames(field: "materialsToDisplay", files: FileList | null) {
    setForm((current) => ({
      ...current,
      [field]: files ? Array.from(files).map((file) => file.name).join(", ") : ""
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setConflicts([]);

    const endpoint = reservation ? `/api/reservations/${reservation.id}` : "/api/reservations";
    const method = reservation ? "PUT" : "POST";

    const payloadBody = {
      ...form,
      requesterName: user?.name ?? form.requesterName,
      requesterEmail: user?.email ?? form.requesterEmail,
      createdByRole: user?.role ?? form.createdByRole,
      bookingStatus: adminManaged ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      foodServiceRequired: Boolean(form.foodServiceRequired),
      foodServiceLocation: form.foodServiceRequired ? form.foodServiceLocation : ""
    };

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payloadBody)
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(getErrorMessage(payload.error));
      setConflicts(payload.conflicts || []);
      setSaving(false);
      return;
    }

    setSaving(false);
    if (onSaved) {
      onSaved(payload);
      return;
    }

    router.push(`/bookings/${payload.reservation.id}`);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Reservation type *</label>
            <Select value={form.reservationType} required onChange={(event) => setForm({ ...form, reservationType: event.target.value })}>
              {RESERVATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Room *</label>
            <Select value={form.roomId} required onChange={(event) => setForm({ ...form, roomId: event.target.value })}>
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No rooms available for this reservation type
                </option>
              )}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Date from *</label>
            <Input required type="date" value={form.reservationDate} onChange={(event) => setForm({ ...form, reservationDate: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Date to *</label>
            <Input
              required
              type="date"
              value={form.reservationEndDate}
              onChange={(event) => setForm({ ...form, reservationEndDate: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Time from *</label>
            <Input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Time to *</label>
            <Input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Number of attend * {selectedRoom ? `(capacity ${selectedRoom.capacity})` : ""}
            </label>
            <Input
              required
              type="number"
              min={1}
              value={form.attendeesCount}
              onChange={(event) => setForm({ ...form, attendeesCount: Number(event.target.value) })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Guest company *</label>
            <Input required value={form.guestCompany} onChange={(event) => setForm({ ...form, guestCompany: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Guest name</label>
            <Input value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Guest company logo</label>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.bmp,.tif,.tiff,.avif,.heic,image/*"
              onChange={(event) => handleSingleFileName("guestCompanyLogo", event.target.files)}
            />
            <p className="mt-2 text-xs text-slate-500">Accepted image formats include PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, AVIF, and HEIC.</p>
            {form.guestCompanyLogo ? <p className="mt-2 text-xs text-slate-500">{form.guestCompanyLogo}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Charged company *</label>
            <Input required value={form.chargedCompany} onChange={(event) => setForm({ ...form, chargedCompany: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Charged department *</label>
            <Input
              required
              value={form.chargedDepartment}
              onChange={(event) => setForm({ ...form, chargedDepartment: event.target.value })}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Materials to be displayed on screen</label>
            <Input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.png,.jpg,.jpeg,.webp"
              onChange={(event) => handleMultiFileNames("materialsToDisplay", event.target.files)}
            />
            <p className="mt-2 text-xs text-slate-500">Accepted formats include PDF, Word, Excel, PowerPoint, text, CSV, and common image files.</p>
            {form.materialsToDisplay ? <p className="mt-2 text-xs text-slate-500">{form.materialsToDisplay}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Room for food service?</label>
            <Select
              value={
                form.foodServiceRequired === null
                  ? ""
                  : form.foodServiceRequired
                    ? "yes"
                    : "no"
              }
              required
              onChange={(event) =>
                setForm({
                  ...form,
                  foodServiceRequired:
                    event.target.value === ""
                      ? null
                      : event.target.value === "yes",
                  foodServiceLocation:
                    event.target.value === "yes" ? form.foodServiceLocation : ""
                })
              }
            >
              <option value="" disabled>
                Select food service option
              </option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </div>

          {form.foodServiceRequired ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Room for food service will be reserved. Please request food from Nawras HR &gt; Self Service &gt; Food Service.
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Food service room or location *</label>
                <Input
                  required={form.foodServiceRequired === true}
                  value={form.foodServiceLocation}
                  placeholder="Example: Dining Room 2 or Level 1 Lounge"
                  onChange={(event) => setForm({ ...form, foodServiceLocation: event.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Select whether food service is required for this booking.
            </div>
          )}
        </div>

        {user?.role === UserRole.ADMIN ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(form.overrideCapacity)}
              onChange={(event) => setForm({ ...form, overrideCapacity: event.target.checked })}
            />
            Allow attendee count to exceed room capacity
          </label>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Note</label>
          <Textarea value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {adminManaged
            ? "Admin bookings are saved directly as confirmed reservations."
            : "Staff bookings are submitted as pending requests."}
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {conflicts.length > 0 ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Conflicting confirmed bookings</p>
            <ul className="mt-2 space-y-1">
              {conflicts.map((item) => (
                <li key={item.id}>
                  {item.startTime} - {item.endTime} | {item.guestCompany} | {item.chargedDepartment}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : reservation ? "Save changes" : "Create booking"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
