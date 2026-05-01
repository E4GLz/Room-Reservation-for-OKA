"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Download, PencilLine, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { BookingStatus, UserRole } from "@prisma/client";
import { BookingForm } from "@/components/bookings/booking-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { parseStoredAttachments } from "@/lib/attachments";
import {
  canUserViewReservationDetails,
  formatLongDate,
  getRoleLabel,
  getManagerApprovalLabel,
  getManagerApprovalTone,
  reservationCanBeEditedByUser
} from "@/lib/utils";
import { readErrorMessage } from "@/lib/client-errors";
import type { ReservationAuditRecord, ReservationRecord, RoomRecord } from "@/lib/types";

type BookingDetailPageProps = {
  reservation: ReservationRecord;
  rooms: RoomRecord[];
};


export function BookingDetailPage(props: BookingDetailPageProps) {
  const { reservation, rooms } = props;
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useSession();
  const canView = canUserViewReservationDetails(reservation, user);
  const canEdit = reservationCanBeEditedByUser(reservation, user);
  const canManageAttachments = user?.role === "ADMIN";
  const guestLogoAttachments = parseStoredAttachments(reservation.guestCompanyLogo);
  const materialAttachments = parseStoredAttachments(reservation.materialsToDisplay);
  const canManagerReview =
    reservation.managerId === user?.id &&
    reservation.createdByRole === UserRole.STANDARD &&
    reservation.managerApprovalStatus === "PENDING" &&
    reservation.bookingStatus === BookingStatus.PENDING;
  const canAdminReview =
    user?.role === UserRole.ADMIN &&
    reservation.bookingStatus === BookingStatus.PENDING &&
    (reservation.createdByRole !== UserRole.STANDARD || reservation.managerApprovalStatus !== "PENDING");
  const moveRoomTypes = useMemo(
    () =>
      Array.from(
        new Set(
          rooms
            .filter((room) => room.status === "ACTIVE")
            .map((room) => room.type)
        )
      ),
    [rooms]
  );
  const [moveReservationType, setMoveReservationType] = useState(reservation.reservationType);
  const [moveRoomId, setMoveRoomId] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [moveSuccess, setMoveSuccess] = useState("");
  const availableMoveRooms = useMemo(
    () => rooms.filter((room) => room.status === "ACTIVE" && room.type === moveReservationType && room.id !== reservation.roomId),
    [moveReservationType, reservation.roomId, rooms]
  );

  if (!canView) {
    return (
      <div className="px-8 py-6">
        <Card className="rounded-[28px]">
          <p className="text-lg font-semibold text-slate-950">{t("Booking details are restricted")}</p>
          <p className="mt-2 text-sm text-slate-600">
            {t("You can only open booking details that belong to you or your assigned approvals. Please use the planner for the general schedule view.")}
          </p>
          <div className="mt-6">
            <Link href="/planner">
              <Button variant="ghost">{t("Back to planner")}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  async function handleCancel() {
    const confirmed = window.confirm(t("Cancel this booking? The reservation will remain in history."));
    if (!confirmed) {
      return;
    }

    await fetch(`/api/reservations/${reservation.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cancellationNotes: t("Cancelled from booking detail page")
      })
    });

    router.refresh();
  }

  async function handleManagerReview(action: "approve" | "reject") {
    await fetch(`/api/reservations/${reservation.id}/manager-approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action
      })
    });

    router.refresh();
  }

  async function handleAdminReview(action: "approve" | "reject") {
    const confirmed =
      action === "approve"
        ? window.confirm(t("Confirm this booking request?"))
        : window.confirm(t("Reject this booking request?"));

    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/reservations/${reservation.id}/admin-approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      const message = await readErrorMessage(response, t("Unable to process admin approval."));
      window.alert(message);
      return;
    }

    router.refresh();
  }

  async function handleMoveReservation() {
    if (!moveRoomId || !moveReason.trim()) {
      setMoveError(t("Please select the new room and provide the reason for the room change."));
      setMoveSuccess("");
      return;
    }

    setMoveSaving(true);
    setMoveError("");
    setMoveSuccess("");

    const response = await fetch(`/api/reservations/${reservation.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: moveRoomId,
        reservationType: moveReservationType,
        reason: moveReason
      })
    });

    if (!response.ok) {
      setMoveError(await readErrorMessage(response, t("Unable to move reservation.")));
      setMoveSaving(false);
      return;
    }

    const payload = (await response.json()) as { emailWarning?: string | null };
    setMoveSuccess(
      payload.emailWarning
        ? `${t("Reservation moved successfully.")} ${t("Email warning")}: ${payload.emailWarning}`
        : t("Reservation moved successfully and the requester was notified.")
    );
    setMoveReason("");
    setMoveSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <Card className="rounded-[28px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{reservation.reservationCode}</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">{reservation.guestCompany}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {reservation.room.name} | {formatLongDate(reservation.reservationDate)} {t("to")} {formatLongDate(reservation.reservationEndDate)} | {reservation.startTime} - {reservation.endTime}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge label={reservation.bookingStatus} />
            {reservation.createdByRole === "STANDARD" ? (
              <Badge
                label={getManagerApprovalLabel(reservation)}
                tone={getManagerApprovalTone(reservation.managerApprovalStatus)}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <DetailItem label={t("Reservation type")} value={t(reservation.reservationType)} />
          <DetailItem label={t("Meeting Title")} value={reservation.guestCompany} />
          <DetailItem label={t("Guest name")} value={reservation.guestName || t("Not provided")} />
          <DetailItem label={t("Charged company")} value={reservation.chargedCompany} />
          <DetailItem label={t("Charged department")} value={reservation.chargedDepartment} />
          <DetailItem label={t("Attendees")} value={String(reservation.attendeesCount)} />
          <DetailItem label={t("Food service")} value={reservation.foodServiceRequired ? t("Yes") : t("No")} />
          <DetailItem
            label={t("Food service location")}
            value={reservation.foodServiceRequired ? reservation.foodServiceLocation || t("Not provided") : t("Not required")}
          />
          <DetailItem label={t("Requester")} value={reservation.requesterName} />
          <DetailItem label={t("Email")} value={reservation.requesterEmail} />
          <DetailItem label={t("Contact")} value={reservation.contactNumber || t("Not provided")} />
          <DetailItem label={t("Manager review")} value={t(getManagerApprovalLabel(reservation))} />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">{t("Materials on screen")}</p>
          <p className="mt-2 text-sm text-slate-600">
            {materialAttachments.length > 0
              ? materialAttachments.map((item) => item.name).join(", ")
              : reservation.materialsToDisplay || t("No display materials provided.")}
          </p>
        </div>

        {canManageAttachments ? (
          <AttachmentPanel
            t={t}
            guestLogoAttachments={guestLogoAttachments}
            materialAttachments={materialAttachments}
          />
        ) : null}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">{t("Remarks")}</p>
          <p className="mt-2 text-sm text-slate-600">{reservation.remarks || t("No additional notes.")}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/planner">
            <Button variant="ghost">{t("Back to planner")}</Button>
          </Link>
          {canManagerReview ? (
            <>
              <Button variant="ghost" onClick={() => void handleManagerReview("reject")}>
                {t("Reject as manager")}
              </Button>
              <Button onClick={() => void handleManagerReview("approve")}>
                {t("Approve and send to admin")}
              </Button>
            </>
          ) : null}
          {canAdminReview ? (
            <>
              <Button variant="ghost" onClick={() => void handleAdminReview("reject")}>
                {t("Reject request")}
              </Button>
              <Button onClick={() => void handleAdminReview("approve")}>
                {t("Accept booking request")}
              </Button>
            </>
          ) : null}
          {canEdit && reservation.bookingStatus !== BookingStatus.CANCELLED ? (
            <Button variant="danger" onClick={handleCancel}>
              {t("Cancel booking")}
            </Button>
          ) : null}
        </div>
      </Card>

      {canEdit ? (
        <Card className="rounded-[28px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{t("Move reservation to another room")}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {t("Use this when the meeting must be reassigned to another room. The requester will receive an email with the reason for the change.")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1fr_1.2fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("New reservation type")}</label>
              <select
                value={moveReservationType}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setMoveReservationType(nextType);
                  setMoveRoomId("");
                }}
                className="w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {moveRoomTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("New room")}</label>
              <select
                value={moveRoomId}
                onChange={(event) => setMoveRoomId(event.target.value)}
                className="w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">{t("Select a room")}</option>
                {availableMoveRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.code} - {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Reason for room change")}</label>
              <Textarea value={moveReason} onChange={(event) => setMoveReason(event.target.value)} />
            </div>

            <div className="flex items-end">
              <Button type="button" disabled={moveSaving || availableMoveRooms.length === 0} onClick={() => void handleMoveReservation()}>
                {moveSaving ? t("Saving...") : t("Move reservation")}
              </Button>
            </div>
          </div>

          {availableMoveRooms.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t("No other active rooms are available under the selected reservation type.")}</p>
          ) : null}
          {moveError ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{moveError}</div> : null}
          {moveSuccess ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{moveSuccess}</div> : null}
        </Card>
      ) : null}

      {canEdit ? (
        <BookingForm
          rooms={rooms}
          reservation={reservation}
          onSaved={({ reservation: updated }) => {
            router.push(`/bookings/${updated.id}`);
            router.refresh();
          }}
        />
      ) : null}

      <Card className="rounded-[28px]">
        <h3 className="text-lg font-semibold text-slate-950">{t("Audit trail")}</h3>
        <div className="mt-4 space-y-3">
          {reservation.auditEntries?.map((entry) => (
            <AuditEntryCard key={entry.id} entry={entry} t={t} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function AuditEntryCard({
  entry,
  t
}: {
  entry: ReservationAuditRecord;
  t: (key: string) => string;
}) {
  const meta = getAuditEntryMeta(entry, t);

  return (
    <div className={`rounded-2xl border px-4 py-4 ${meta.containerClassName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-2 ${meta.iconClassName}`}>
            <meta.Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">{meta.title}</p>
            <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          {new Date(entry.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="font-medium text-slate-800">{entry.actorName}</span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
          {t(getRoleLabel(entry.actorRole))}
        </span>
      </div>
      {entry.notes ? (
        <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
          {entry.notes}
        </div>
      ) : null}
    </div>
  );
}

function getAuditEntryMeta(entry: ReservationAuditRecord, t: (key: string) => string) {
  switch (entry.action) {
    case "CREATED":
      return {
        title: t("Booking request created"),
        description: t("The reservation was submitted into the system."),
        Icon: PencilLine,
        containerClassName: "border-slate-200 bg-slate-50",
        iconClassName: "bg-slate-100 text-slate-700"
      };
    case "UPDATED":
      return {
        title: t("Booking updated"),
        description: t("Reservation details were changed."),
        Icon: PencilLine,
        containerClassName: "border-sky-200 bg-sky-50",
        iconClassName: "bg-sky-100 text-sky-700"
      };
    case "ROOM_REASSIGNED":
      return {
        title: t("Room reassigned"),
        description: t("The reservation was moved to a different room."),
        Icon: PencilLine,
        containerClassName: "border-indigo-200 bg-indigo-50",
        iconClassName: "bg-indigo-100 text-indigo-700"
      };
    case "MANAGER_APPROVAL_REQUESTED":
      return {
        title: t("Sent to manager"),
        description: t("The request is waiting for manager review before admin confirmation."),
        Icon: Clock3,
        containerClassName: "border-amber-200 bg-amber-50",
        iconClassName: "bg-amber-100 text-amber-700"
      };
    case "MANAGER_APPROVED":
      return {
        title: t("Manager approved"),
        description: t("The request passed manager review and moved to admin."),
        Icon: ShieldCheck,
        containerClassName: "border-blue-200 bg-blue-50",
        iconClassName: "bg-blue-100 text-blue-700"
      };
    case "MANAGER_REJECTED":
      return {
        title: t("Manager rejected"),
        description: t("The request was declined during manager review."),
        Icon: XCircle,
        containerClassName: "border-rose-200 bg-rose-50",
        iconClassName: "bg-rose-100 text-rose-700"
      };
    case "ADMIN_APPROVED":
      return {
        title: t("Admin approved"),
        description: t("The request was confirmed and became an active booking."),
        Icon: CheckCircle2,
        containerClassName: "border-emerald-200 bg-emerald-50",
        iconClassName: "bg-emerald-100 text-emerald-700"
      };
    case "ADMIN_REJECTED":
      return {
        title: t("Admin rejected"),
        description: t("The request was declined during admin review."),
        Icon: XCircle,
        containerClassName: "border-rose-200 bg-rose-50",
        iconClassName: "bg-rose-100 text-rose-700"
      };
    case "CANCELLED":
      return {
        title: t("Booking cancelled"),
        description: t("The reservation was cancelled but kept in history."),
        Icon: XCircle,
        containerClassName: "border-rose-200 bg-rose-50",
        iconClassName: "bg-rose-100 text-rose-700"
      };
    default:
      return {
        title: entry.action,
        description: t("System activity recorded for this reservation."),
        Icon: UserRound,
        containerClassName: "border-slate-200 bg-slate-50",
        iconClassName: "bg-slate-100 text-slate-700"
      };
  }
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function AttachmentPanel({
  t,
  guestLogoAttachments,
  materialAttachments
}: {
  t: (key: string) => string;
  guestLogoAttachments: Array<{ name: string; url: string }>;
  materialAttachments: Array<{ name: string; url: string }>;
}) {
  const hasAttachments = guestLogoAttachments.length > 0 || materialAttachments.length > 0;

  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">{t("Admin attachments")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("Download the uploaded files for room setup and screens.")}</p>
        </div>
      </div>

      {!hasAttachments ? (
        <p className="mt-3 text-sm text-slate-600">{t("No uploaded attachments are available for this booking.")}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AttachmentList title={t("Meeting title logo")} items={guestLogoAttachments} emptyMessage={t("No logo uploaded.")} t={t} />
          <AttachmentList title={t("Materials to display")} items={materialAttachments} emptyMessage={t("No material files uploaded.")} t={t} />
        </div>
      )}
    </div>
  );
}

function AttachmentList({
  title,
  items,
  emptyMessage,
  t
}: {
  title: string;
  items: Array<{ name: string; url: string }>;
  emptyMessage: string;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.name}</p>
              {item.url ? (
                <a
                  href={item.url}
                  download={item.name}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  <Download className="h-4 w-4" />
                  {t("Download")}
                </a>
              ) : (
                <span className="text-xs text-slate-400">{t("Legacy name only")}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
