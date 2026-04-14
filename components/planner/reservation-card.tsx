"use client";

import Link from "next/link";
import { Clock3, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { canUserViewReservationDetails, cn, getManagerApprovalLabel, getManagerApprovalTone } from "@/lib/utils";
import type { ReservationRecord } from "@/lib/types";

export function ReservationCard({
  reservation,
  compact = false
}: {
  reservation: ReservationRecord;
  compact?: boolean;
}) {
  const { user } = useSession();
  const { t } = useLanguage();
  const canOpenDetail = canUserViewReservationDetails(reservation, user);
  const cardClassName = cn(
    "block rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.94)] px-3 py-2.5 shadow-sm transition",
    canOpenDetail && "hover:border-[rgba(37,87,229,0.3)] hover:-translate-y-[1px] hover:shadow-md",
    compact && "rounded-[16px] px-2.5 py-2"
  );

  if (!canOpenDetail) {
    return (
      <div className={cardClassName}>
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
          <Clock3 className="h-3 w-3" />
          {reservation.startTime} - {reservation.endTime}
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-slate-900">{t("Blocked")}</p>
        <p className="truncate text-xs text-slate-600">{t("Reservation details are private")}</p>
      </div>
    );
  }

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
          <Clock3 className="h-3 w-3" />
          {reservation.startTime} - {reservation.endTime}
        </div>
        <Badge label={reservation.bookingStatus} />
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-900">{reservation.guestCompany}</p>
      <p className="truncate text-xs text-slate-600">
        {reservation.chargedDepartment} | {t(reservation.reservationType)}
      </p>
      {reservation.createdByRole === "STANDARD" && reservation.bookingStatus !== "CONFIRMED" ? (
        <div className="mt-2">
          <Badge label={getManagerApprovalLabel(reservation)} tone={getManagerApprovalTone(reservation.managerApprovalStatus)} />
        </div>
      ) : null}
      {reservation.foodServiceRequired ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-700">
          <UtensilsCrossed className="h-3 w-3" />
          {t("Food service")}
        </p>
      ) : null}
    </>
  );

  return (
    <Link href={`/bookings/${reservation.id}`} className={cardClassName}>
      {content}
    </Link>
  );
}
