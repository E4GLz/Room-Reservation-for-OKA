"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { BookingStatus, UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { ReservationInput, ReservationRecord, RoomRecord } from "@/lib/types";
import { RESERVATION_TYPES } from "@/lib/constants";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import {
  parseStoredAttachments,
  serializeSingleStoredAttachment,
  serializeStoredAttachments,
  type StoredAttachment
} from "@/lib/attachments";
import { extractFlattenedFormError, readErrorMessage } from "@/lib/client-errors";
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
    reservationDate: reservation ? reservation.reservationDate?.toString()?.slice(0, 10) : toInputDate(new Date()),
    reservationEndDate: reservation ? reservation.reservationEndDate?.toString()?.slice(0, 10) : toInputDate(new Date()),
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
  const searchParams = useSearchParams();
  const { user } = useSession();
  const { t } = useLanguage();
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(rooms, reservation, user?.role, user?.name, user?.email)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [conflicts, setConflicts] = useState<ReservationRecord[]>([]);
  const [selectedGuestLogoFiles, setSelectedGuestLogoFiles] = useState<File[]>([]);
  const [selectedMaterialFiles, setSelectedMaterialFiles] = useState<File[]>([]);
  const previousReservationIdRef = useRef<string | null>(reservation?.id ?? null);

  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.type === form.reservationType),
    [form.reservationType, rooms]
  );

  useEffect(() => {
    const currentReservationId = reservation?.id ?? null;
    if (previousReservationIdRef.current === currentReservationId) {
      return;
    }

    previousReservationIdRef.current = currentReservationId;
    setForm(buildInitialState(rooms, reservation, user?.role, user?.name, user?.email));
    setError("");
    setConflicts([]);
    setSaving(false);
    setSelectedGuestLogoFiles([]);
    setSelectedMaterialFiles([]);
  }, [reservation?.id, reservation, rooms, user?.role, user?.name, user?.email]);

  useEffect(() => {
    if (reservation || !user) {
      return;
    }

    setForm((current) => ({
      ...current,
      requesterName: current.requesterName || user.name,
      requesterEmail: current.requesterEmail || user.email,
      createdByRole: current.createdByRole || user.role,
      bookingStatus: user.role === UserRole.ADMIN ? BookingStatus.CONFIRMED : BookingStatus.PENDING
    }));
  }, [reservation, user]);

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
  const submitLabel = reservation ? t("Save changes") : t(adminManaged ? "Create booking" : "Request booking");
  const foodServiceSelection =
    form.foodServiceRequired === null
      ? ""
      : form.foodServiceRequired
        ? "yes"
        : "no";

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

    return t("Unable to save reservation.");
  }

  async function uploadFiles(files: File[], kind: "logo" | "materials") {
    if (files.length === 0) {
      return [] as StoredAttachment[];
    }

    const formData = new FormData();
    formData.append("kind", kind);
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, t("Unable to upload files.")));
    }

    const payload = await response.json();
    return (payload.files ?? []) as StoredAttachment[];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setConflicts([]);

    const endpoint = reservation ? `/api/reservations/${reservation.id}` : "/api/reservations";
    const method = reservation ? "PUT" : "POST";

    let guestCompanyLogo = form.guestCompanyLogo;
    let materialsToDisplay = form.materialsToDisplay;

    try {
      if (selectedGuestLogoFiles.length > 0) {
        const uploadedLogo = await uploadFiles(selectedGuestLogoFiles, "logo");
        guestCompanyLogo = serializeSingleStoredAttachment(uploadedLogo[0]);
      }

      if (selectedMaterialFiles.length > 0) {
        const uploadedMaterials = await uploadFiles(selectedMaterialFiles, "materials");
        materialsToDisplay = serializeStoredAttachments(uploadedMaterials);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("Unable to upload files."));
      setSaving(false);
      return;
    }

    const payloadBody = {
      ...form,
      guestCompanyLogo,
      materialsToDisplay,
      requesterName: reservation ? form.requesterName : user?.name ?? form.requesterName,
      requesterEmail: reservation ? form.requesterEmail : user?.email ?? form.requesterEmail,
      createdByRole: reservation?.createdByRole ?? user?.role ?? form.createdByRole,
      bookingStatus:
        adminManaged && reservation?.createdByRole === UserRole.STANDARD && reservation.managerApprovalStatus === "PENDING"
          ? BookingStatus.PENDING
          : adminManaged
            ? BookingStatus.CONFIRMED
            : BookingStatus.PENDING,
      foodServiceRequired: Boolean(form.foodServiceRequired),
      foodServiceLocation: form.foodServiceRequired ? form.foodServiceLocation : ""
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payloadBody)
      });

      if (!response.ok) {
        let conflictPayload: unknown = null;
        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          try {
            conflictPayload = await response.json();
          } catch {
            conflictPayload = null;
          }
        }

        setError(
          conflictPayload
            ? getErrorMessage(
                typeof conflictPayload === "object" &&
                  conflictPayload !== null &&
                  "error" in conflictPayload
                  ? (conflictPayload as { error?: unknown }).error
                  : conflictPayload
              )
            : await readErrorMessage(response, t("Unable to save reservation."), extractFlattenedFormError)
        );
        setConflicts(
          conflictPayload &&
            typeof conflictPayload === "object" &&
            conflictPayload !== null &&
            "conflicts" in conflictPayload &&
            Array.isArray((conflictPayload as { conflicts?: unknown }).conflicts)
            ? ((conflictPayload as { conflicts?: ReservationRecord[] }).conflicts ?? [])
            : []
        );
        setSaving(false);
        return;
      }

      const payload = await response.json();
      setSaving(false);
      if (onSaved) {
        onSaved(payload);
        return;
      }

      if (!reservation && !adminManaged) {
        router.push("/my-bookings?requestSubmitted=1");
        router.refresh();
        return;
      }

      if (!reservation && adminManaged && searchParams.get("returnTo") === "planner") {
        router.push("/planner?bookingCreated=1");
        router.refresh();
        return;
      }

      router.push(`/bookings/${payload.reservation.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("Unable to save reservation."));
      setConflicts([]);
      setSaving(false);
    }
  }

  const existingLogoAttachments = parseStoredAttachments(form.guestCompanyLogo);
  const existingMaterialAttachments = parseStoredAttachments(form.materialsToDisplay);

  return (
    <Card className="p-6">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Reservation type")} *</label>
            <Select value={form.reservationType} required onChange={(event) => setForm({ ...form, reservationType: event.target.value })}>
              {RESERVATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(type)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Room")} *</label>
            <Select value={form.roomId} required onChange={(event) => setForm({ ...form, roomId: event.target.value })}>
              {filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  {t("No rooms available for this reservation type")}
                </option>
              )}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Date from")} *</label>
            <Input required type="date" value={form.reservationDate} onChange={(event) => setForm({ ...form, reservationDate: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Date to")} *</label>
            <Input
              required
              type="date"
              value={form.reservationEndDate}
              onChange={(event) => setForm({ ...form, reservationEndDate: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Time from")} *</label>
            <Input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Time to")} *</label>
            <Input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {t("Number of attend")} * {selectedRoom ? `(${t("capacity")} ${selectedRoom.capacity})` : ""}
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
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Meeting Title")} *</label>
            <Input required value={form.guestCompany} onChange={(event) => setForm({ ...form, guestCompany: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Guest name")}</label>
            <Input value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Guest company logo")}</label>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.bmp,.tif,.tiff,.avif,.heic,image/*"
              onChange={(event) => setSelectedGuestLogoFiles(event.target.files ? Array.from(event.target.files).slice(0, 1) : [])}
            />
            <p className="mt-2 text-xs text-slate-500">{t("Accepted image formats include PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, AVIF, and HEIC.")}</p>
            {selectedGuestLogoFiles.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">{selectedGuestLogoFiles[0]?.name}</p>
            ) : existingLogoAttachments[0]?.name ? (
              <p className="mt-2 text-xs text-slate-500">{existingLogoAttachments[0].name}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Charged company")} *</label>
            <Input required value={form.chargedCompany} onChange={(event) => setForm({ ...form, chargedCompany: event.target.value })} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Charged department")} *</label>
            <Input
              required
              value={form.chargedDepartment}
              onChange={(event) => setForm({ ...form, chargedDepartment: event.target.value })}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Materials to be displayed on screen")}</label>
            <Input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.png,.jpg,.jpeg,.webp"
              onChange={(event) => setSelectedMaterialFiles(event.target.files ? Array.from(event.target.files) : [])}
            />
            <p className="mt-2 text-xs text-slate-500">{t("Accepted formats include PDF, Word, Excel, PowerPoint, text, CSV, and common image files.")}</p>
            {selectedMaterialFiles.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">{selectedMaterialFiles.map((file) => file.name).join(", ")}</p>
            ) : existingMaterialAttachments.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">{existingMaterialAttachments.map((file) => file.name).join(", ")}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("Room for food service?")}</label>
            <Select
              value={foodServiceSelection}
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
              <option value="" hidden>
                {t("Select food service option")}
              </option>
              <option value="no">{t("No")}</option>
              <option value="yes">{t("Yes")}</option>
            </Select>
          </div>

          {form.foodServiceRequired ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t("Room for food service will be reserved. Please request food from Nawras HR > Self Service > Food Service.")}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("Food service room or location")} *</label>
                <Input
                  required={form.foodServiceRequired === true}
                  value={form.foodServiceLocation}
                  placeholder={t("Example: Dining Room 2 or Level 1 Lounge")}
                  onChange={(event) => setForm({ ...form, foodServiceLocation: event.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {t("Select whether food service is required for this booking.")}
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
            {t("Allow attendee count to exceed room capacity")}
          </label>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t("Note")}</label>
          <Textarea value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {conflicts.length > 0 ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">{t("Conflicting confirmed bookings")}</p>
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
            {saving ? t("Saving...") : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
