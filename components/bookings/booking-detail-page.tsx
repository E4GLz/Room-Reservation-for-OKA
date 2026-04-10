"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { BookingStatus, UserRole } from "@prisma/client";
import { BookingForm } from "@/components/bookings/booking-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { parseStoredAttachments } from "@/lib/attachments";
import {
  formatLongDate,
  getManagerApprovalLabel,
  getManagerApprovalTone,
  reservationCanBeEditedByUser
} from "@/lib/utils";
import type { ReservationRecord, RoomRecord } from "@/lib/types";

type BookingDetailPageProps = {
  reservation: ReservationRecord;
  rooms: RoomRecord[];
};


export function BookingDetailPage(props: BookingDetailPageProps) {
  const { reservation, rooms } = props;
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useSession();
  const canView =
    user?.role === "ADMIN" || reservation.requesterEmail === user?.email || reservation.managerId === user?.id;
  const canEdit = reservationCanBeEditedByUser(reservation, user);
  const canManageAttachments = user?.role === "ADMIN";
  const guestLogoAttachments = parseStoredAttachments(reservation.guestCompanyLogo);
  const materialAttachments = parseStoredAttachments(reservation.materialsToDisplay);
  const canManagerReview =
    reservation.managerId === user?.id &&
    reservation.createdByRole === UserRole.STANDARD &&
    reservation.managerApprovalStatus === "PENDING" &&
    reservation.bookingStatus === BookingStatus.PENDING;

  if (!canView) {
    return (
      <div className="px-8 py-6">
        <Card className="rounded-[28px]">
          <p className="text-lg font-semibold text-slate-950">{t("Booking details are restricted")}</p>
          <p className="mt-2 text-sm text-slate-600">
            {t("Staff users can only open their own booking history. Please use the planner for the general schedule view.")}
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
        actorName: user?.name,
        actorEmail: user?.email,
        actorRole: user?.role ?? UserRole.STANDARD,
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
        action,
        actorName: user?.name,
        actorEmail: user?.email,
        actorRole: user?.role ?? UserRole.STANDARD
      })
    });

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
          <DetailItem label={t("Guest company")} value={reservation.guestCompany} />
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
          {canEdit && reservation.bookingStatus !== BookingStatus.CANCELLED ? (
            <Button variant="danger" onClick={handleCancel}>
              {t("Cancel booking")}
            </Button>
          ) : null}
        </div>
      </Card>

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
            <div key={entry.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {entry.actorName} ({entry.actorRole})
              </p>
              <p className="mt-2 text-sm text-slate-500">{entry.notes || t("No note recorded.")}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
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
  guestLogoAttachments,
  materialAttachments
}: {
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
          <AttachmentList title={t("Guest company logo")} items={guestLogoAttachments} emptyMessage={t("No logo uploaded.")} />
          <AttachmentList title={t("Materials to display")} items={materialAttachments} emptyMessage={t("No material files uploaded.")} />
        </div>
      )}
    </div>
  );
}

function AttachmentList({
  title,
  items,
  emptyMessage
}: {
  title: string;
  items: Array<{ name: string; url: string }>;
  emptyMessage: string;
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
                  download
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
