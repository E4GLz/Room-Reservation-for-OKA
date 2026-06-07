"use client";

import { useEffect, useState } from "react";
import { UserRole, UserStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatePanel } from "@/components/ui/state-panel";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { extractFlattenedFormError, readErrorMessage } from "@/lib/client-errors";
import { getRoleLabel } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";

function initialForm(user?: UserRecord | null) {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    password: "",
    managerId: user?.managerId ?? "",
    role: user?.role ?? ("STANDARD" as UserRole),
    status: user?.status ?? UserStatus.ACTIVE
  };
}

export function UsersPage({ users }: { users: UserRecord[] }) {
  const { t } = useLanguage();
  const { user: sessionUser } = useSession();
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState(initialForm());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const managerOptions = users.filter(
    (entry) => entry.status === UserStatus.ACTIVE && (entry.role === UserRole.ADMIN || entry.role === ("MANAGER" as UserRole))
  );
  const pendingRegistrations = users.filter(
    (entry) => entry.role === UserRole.STANDARD && entry.status === UserStatus.INACTIVE
  );

  useEffect(() => {
    setForm(initialForm(editingUser));
    setError("");
    setSaving(false);
  }, [editingUser]);

  if (sessionUser?.role !== "ADMIN") {
    return <StatePanel title={t("Admin access required")} message={t("Only admin users can manage user accounts.")} />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(editingUser ? `/api/users/${editingUser.id}` : "/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        setError(
          await readErrorMessage(response, t("Unable to save user."), (payload) =>
            extractFlattenedFormError(payload) ||
            (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
              ? String((payload as { error?: unknown }).error)
              : null)
          )
        );
        setSaving(false);
        return;
      }

      window.location.reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("Unable to save user."));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="flex justify-end">
        <Button
          className="dark-mode-white-button"
          onClick={() => {
            setEditingUser(null);
            setForm(initialForm());
            setShowForm((current) => !current);
          }}
        >
          {showForm ? t("Hide form") : t("Create user")}
        </Button>
      </div>

      {pendingRegistrations.length > 0 ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">{t("Pending registration approvals")}</p>
          <p className="mt-1 text-sm text-amber-800">
            {pendingRegistrations.length} {t(pendingRegistrations.length === 1 ? "newly registered account is waiting for admin review." : "newly registered accounts are waiting for admin review.")}
            {" "}
            {t("Open the user record and switch the status to Active to approve access.")}
          </p>
        </div>
      ) : null}

      {showForm || editingUser ? (
        <Card>
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Full name")}</label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Email")}</label>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Phone number")}</label>
              <Input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {editingUser ? t("Reset password") : t("Password")}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={editingUser ? t("Leave blank to keep current password") : ""}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Role")}</label>
              <Select
                value={form.role}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as UserRole,
                    managerId: event.target.value === "STANDARD" ? form.managerId : ""
                  })
                }
              >
                <option value={UserRole.ADMIN}>{t("Admin")}</option>
                <option value="MANAGER">{t("Manager")}</option>
                <option value="SERVICE">{t("Service")}</option>
                <option value={UserRole.STANDARD}>{t("Staff")}</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Manager (optional)")}</label>
              <Select
                value={form.managerId}
                disabled={form.role !== "STANDARD"}
                onChange={(event) => setForm({ ...form, managerId: event.target.value })}
              >
                <option value="">
                  {form.role === "STANDARD" ? t("Select manager if needed") : t("Not required for this role")}
                </option>
                {managerOptions
                  .filter((entry) => entry.id !== editingUser?.id)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({t(getRoleLabel(entry.role))})
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Status")}</label>
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>
                <option value={UserStatus.ACTIVE}>{t("Active")}</option>
                <option value={UserStatus.INACTIVE}>{t("Inactive")}</option>
              </Select>
            </div>
            {error ? <div className="lg:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <div className="lg:col-span-2 flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => {
                setEditingUser(null);
                setShowForm(false);
                setForm(initialForm());
              }}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={saving} className="dark-mode-white-button">
                {saving ? t("Saving...") : editingUser ? t("Update user") : t("Create user")}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {users.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{entry.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{entry.email}</p>
                <p className="mt-2 text-sm text-slate-600">{entry.phoneNumber || t("No phone number set")}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {t("Manager")}: {entry.managerName || t("No manager assigned")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t(getRoleLabel(entry.role))}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{t(entry.status === UserStatus.ACTIVE ? "Active" : "Inactive")}</p>
                {entry.role === UserRole.STANDARD && entry.status === UserStatus.INACTIVE ? (
                  <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-amber-800 ring-1 ring-amber-200">
                    {t("Pending approval")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingUser(entry);
                  setForm(initialForm(entry));
                  setShowForm(true);
                }}
              >
                {entry.role === UserRole.STANDARD && entry.status === UserStatus.INACTIVE ? t("Review registration") : t("Edit user")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
