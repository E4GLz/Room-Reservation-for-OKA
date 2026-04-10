"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookingStatus, UserRole } from "@prisma/client";
import { BookingForm } from "@/components/bookings/booking-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { formatLongDate, reservationCanBeEditedByUser } from "@/lib/utils";
import type { ReservationRecord, RoomRecord } from "@/lib/types";

type BookingDetailPageProps = {
  reservation: ReservationRecord;
  rooms: RoomRecord[];
};


export function BookingDetailPage(props: BookingDetailPageProps) {
  const { reservation, rooms } = props;
  const router = useRouter();
  const { user } = useSession();
  const canView = user?.role === "ADMIN" || reservation.requesterEmail === user?.email;
  const canEdit = reservationCanBeEditedByUser(reservation, user);

  if (!canView) {
    return (
      <div className="px-8 py-6">
        <Card className="rounded-[28px]">
          <p className="text-lg font-semibold text-slate-950">Booking details are restricted</p>
          <p className="mt-2 text-sm text-slate-600">
            Staff users can only open their own booking history. Please use the planner for the general schedule view.
          </p>
          <div className="mt-6">
            <Link href="/planner">
              <Button variant="ghost">Back to planner</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  async function handleCancel() {
    const confirmed = window.confirm("Cancel this booking? The reservation will remain in history.");
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
        cancellationNotes: "Cancelled from booking detail page"
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
              {reservation.room.name} | {formatLongDate(reservation.reservationDate)} to {formatLongDate(reservation.reservationEndDate)} | {reservation.startTime} - {reservation.endTime}
            </p>
          </div>
          <Badge label={reservation.bookingStatus} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <DetailItem label="Reservation type" value={reservation.reservationType} />
          <DetailItem label="Guest company" value={reservation.guestCompany} />
          <DetailItem label="Guest name" value={reservation.guestName || "Not provided"} />
          <DetailItem label="Charged company" value={reservation.chargedCompany} />
          <DetailItem label="Charged department" value={reservation.chargedDepartment} />
          <DetailItem label="Attendees" value={String(reservation.attendeesCount)} />
          <DetailItem label="Food service" value={reservation.foodServiceRequired ? "Yes" : "No"} />
          <DetailItem
            label="Food service location"
            value={reservation.foodServiceRequired ? reservation.foodServiceLocation || "Not provided" : "Not required"}
          />
          <DetailItem label="Requester" value={reservation.requesterName} />
          <DetailItem label="Email" value={reservation.requesterEmail} />
          <DetailItem label="Contact" value={reservation.contactNumber || "Not provided"} />
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Materials on screen</p>
          <p className="mt-2 text-sm text-slate-600">{reservation.materialsToDisplay || "No display materials provided."}</p>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Remarks</p>
          <p className="mt-2 text-sm text-slate-600">{reservation.remarks || "No additional notes."}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/planner">
            <Button variant="ghost">Back to planner</Button>
          </Link>
          {canEdit && reservation.bookingStatus !== BookingStatus.CANCELLED ? (
            <Button variant="danger" onClick={handleCancel}>
              Cancel booking
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
        <h3 className="text-lg font-semibold text-slate-950">Audit trail</h3>
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
              <p className="mt-2 text-sm text-slate-500">{entry.notes || "No note recorded."}</p>
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
