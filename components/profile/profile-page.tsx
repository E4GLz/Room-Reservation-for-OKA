"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatePanel } from "@/components/ui/state-panel";
import { useSession } from "@/components/providers/session-provider";
import { readErrorMessage } from "@/lib/client-errors";

export function ProfilePage() {
  const router = useRouter();
  const { user, updateSessionUser, logout, isReady } = useSession();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    currentPassword: "",
    newPassword: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber ?? ""
    }));
  }, [user]);

  if (isReady && !user) {
    return <StatePanel title="Sign in required" message="Please sign in to view and update your profile settings." />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          ...form
        })
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Unable to update profile."));
        setSaving(false);
        return;
      }

      const payload = await response.json();
      updateSessionUser(payload.user);
      setSaving(false);
      setForm((current) => ({ ...current, currentPassword: "", newPassword: "" }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update profile.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 px-8 py-6">
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
            <label className="mb-2 block text-sm font-medium text-slate-700">Current password</label>
            <Input type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
            <Input type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
          </div>
          {error ? <div className="lg:col-span-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <div className="lg:col-span-2 flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              Sign out
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
