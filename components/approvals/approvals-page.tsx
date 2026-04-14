"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatePanel } from "@/components/ui/state-panel";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { readErrorMessage } from "@/lib/client-errors";
import { formatLongDate } from "@/lib/utils";
import type { ReservationRecord } from "@/lib/types";

export function ApprovalsPage() {
  const { t } = useLanguage();
  const { user, isReady } = useSession();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = user?.role === UserRole.ADMIN;
  const isManager = user?.role === UserRole.MANAGER;
  const endpoint = isAdmin ? "/api/admin-approvals" : "/api/manager-approvals";

  const content = useMemo(
    () => ({
      title: isAdmin ? t("Admin approval queue") : t("Approval requests"),
      description: isAdmin
        ? t("Review booking requests that have completed manager review and are ready for admin action.")
        : t("Review booking requests submitted by users who report to you."),
      loadingTitle: t("Loading approvals"),
      loadingMessage: isAdmin
        ? t("Checking whether any booking requests are waiting for admin review.")
        : t("Checking whether any team requests need your review."),
      emptyTitle: isAdmin ? t("No admin requests waiting") : t("No approval requests waiting"),
      emptyMessage: isAdmin
        ? t("There are no booking requests currently waiting for admin approval.")
        : t("There are no booking requests currently waiting for your manager approval."),
      successApprove: isAdmin ? t("Request approved and booking confirmed.") : t("Request approved and forwarded to admin."),
      successReject: isAdmin ? t("Request rejected by admin review.") : t("Request rejected by manager review."),
      actionError: isAdmin ? t("Unable to process admin approval.") : t("Unable to process manager approval."),
      approveLabel: isAdmin ? t("Accept booking request") : t("Approve"),
      rejectLabel: isAdmin ? t("Reject request") : t("Reject")
    }),
    [isAdmin, t]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user || (!isAdmin && !isManager)) {
      setLoading(false);
      return;
    }

    async function loadApprovals() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(endpoint);

        if (!response.ok) {
          setError(await readErrorMessage(response, content.actionError));
          setLoading(false);
          return;
        }

        const payload = await response.json();
        setReservations(payload as ReservationRecord[]);
        setLoading(false);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : content.actionError);
        setLoading(false);
      }
    }

    void loadApprovals();
  }, [content.actionError, endpoint, isAdmin, isManager, isReady, user]);

  async function handleReview(reservationId: string, action: "approve" | "reject") {
    setActionId(reservationId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        isAdmin ? `/api/reservations/${reservationId}/admin-approval` : `/api/reservations/${reservationId}/manager-approval`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        }
      );

      if (!response.ok) {
        setError(await readErrorMessage(response, content.actionError));
        setActionId("");
        return;
      }

      setReservations((current) => current.filter((item) => item.id !== reservationId));
      setMessage(action === "approve" ? content.successApprove : content.successReject);
      setActionId("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : content.actionError);
      setActionId("");
    }
  }

  if (isReady && !user) {
    return <StatePanel title={t("Sign in required")} message={t("Please sign in to review approval requests.")} />;
  }

  if (user && !isAdmin && !isManager) {
    return <StatePanel title={t("Approval access required")} message={t("Only managers and admins can review approval requests.")} />;
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{content.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{content.description}</p>
          </div>
          <Link href="/planner">
            <Button variant="secondary">{t("Open planner")}</Button>
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {message ? <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
          {error ? <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          {loading ? (
            <StatePanel title={content.loadingTitle} message={content.loadingMessage} />
          ) : reservations.length === 0 ? (
            <StatePanel title={content.emptyTitle} message={content.emptyMessage} />
          ) : (
            reservations.map((reservation) => (
              <div key={reservation.id} className="rounded-[20px] border border-[var(--line)] bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("Meeting Title")}</p>
                    <p className="text-sm font-semibold text-slate-950">{reservation.guestCompany}</p>
                    <p className="mt-1 text-sm text-slate-600">{reservation.chargedDepartment}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t("Requested by")} {reservation.requesterName}
                    </p>
                  </div>
                  <Link href={`/bookings/${reservation.id}`} className="text-slate-400 transition hover:text-slate-700">
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {reservation.startTime} - {reservation.endTime}
                  </span>
                  <span>{reservation.room.name}</span>
                  <span>{formatLongDate(reservation.reservationDate)}</span>
                  <span>{reservation.attendeesCount} {t("attendees")}</span>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => void handleReview(reservation.id, "reject")}
                    disabled={actionId === reservation.id}
                  >
                    {content.rejectLabel}
                  </Button>
                  <Button onClick={() => void handleReview(reservation.id, "approve")} disabled={actionId === reservation.id}>
                    {actionId === reservation.id ? t("Saving...") : content.approveLabel}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
