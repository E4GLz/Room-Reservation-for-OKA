"use client";

import { useState } from "react";
import { UserRole, UserStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatePanel } from "@/components/ui/state-panel";
import { useSession } from "@/components/providers/session-provider";
import { getRoleLabel } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";

function initialForm(user?: UserRecord | null) {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phoneNumber: user?.phoneNumber ?? "",
    password: "",
    role: user?.role ?? UserRole.STANDARD,
    status: user?.status ?? UserStatus.ACTIVE
  };
}

export function UsersPage({ users }: { users: UserRecord[] }) {
  const { user: sessionUser } = useSession();
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState(initialForm());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (sessionUser?.role !== "ADMIN") {
    return <StatePanel title="Admin access required" message="Only admin users can manage user accounts." />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch(editingUser ? `/api/users/${editingUser.id}` : "/api/users", {
      method: editingUser ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.formErrors?.[0] || payload.error || "Unable to save user.");
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingUser(null);
            setForm(initialForm());
            setShowForm((current) => !current);
          }}
        >
          {showForm ? "Hide form" : "Create user"}
        </Button>
      </div>

      {showForm || editingUser ? (
        <Card>
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone number</label>
              <Input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {editingUser ? "Reset password" : "Password"}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={editingUser ? "Leave blank to keep current password" : ""}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
              <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.STANDARD}>Staff</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>
                <option value={UserStatus.ACTIVE}>Active</option>
                <option value={UserStatus.INACTIVE}>Inactive</option>
              </Select>
            </div>
            {error ? <div className="lg:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <div className="lg:col-span-2 flex justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => {
                setEditingUser(null);
                setShowForm(false);
                setForm(initialForm());
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingUser ? "Update user" : "Create user"}
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
                <p className="mt-2 text-sm text-slate-600">{entry.phoneNumber || "No phone number set"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{getRoleLabel(entry.role)}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{entry.status}</p>
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
                Edit user
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
