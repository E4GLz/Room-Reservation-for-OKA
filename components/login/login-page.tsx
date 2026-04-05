"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, DoorOpen, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/providers/session-provider";

const defaultAdminCredentials = {
  email: "admin@company.internal",
  password: "Admin@123"
};

const featureTiles = [
  {
    title: "Reservation planning",
    description: "Manage room bookings for meetings, workshops, training sessions, and special events.",
    icon: CalendarDays
  },
  {
    title: "Approval control",
    description: "Review pending requests, confirm reservations, and keep the building schedule accurate.",
    icon: ShieldCheck
  },
  {
    title: "Room operations",
    description: "Maintain room master data, capacities, and availability rules from one console.",
    icon: DoorOpen
  },
  {
    title: "User access",
    description: "Support internal admins and staff with controlled access to booking operations.",
    icon: Users
  }
];

export function LoginPage() {
  const router = useRouter();
  const { setSessionUser } = useSession();
  const [email, setEmail] = useState(defaultAdminCredentials.email);
  const [password, setPassword] = useState(defaultAdminCredentials.password);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Unable to sign in.");
      setSaving(false);
      return;
    }

    setSessionUser(payload.user);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-8 px-8 py-8">
      <div className="rounded-[28px] border border-[#d8e4ff] bg-[linear-gradient(135deg,#1b256b_0%,#2557e5_56%,#89b1ff_130%)] px-8 py-8 text-white shadow-[0_28px_54px_-40px_rgba(21,29,103,0.95)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Company workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight lg:text-[2.4rem]">
          Internal Room Reservation Platform
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
          Centralize room reservations, approvals, blocked dates, and building scheduling in one internal operational system.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(180deg,rgba(245,248,255,0.98),rgba(234,241,255,0.92))] px-8 py-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">Platform overview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Built for real company room-booking operations.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              The platform keeps the familiar planner-style view while adding conflict prevention, approvals, reporting, user management, and booking controls for blocked dates and workweeks.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {featureTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.title} className="rounded-[24px] border border-[#d8e4ff] bg-white p-5 shadow-[0_16px_36px_-30px_rgba(37,87,229,0.38)]">
                    <div className="inline-flex rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{tile.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{tile.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">Sign in</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Access your workspace</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in with your assigned account. A default admin account is available for initial setup.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>

            <div className="rounded-[22px] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Default admin account</p>
              <p className="mt-2 text-sm text-slate-700">{defaultAdminCredentials.email}</p>
              <p className="text-sm text-slate-700">{defaultAdminCredentials.password}</p>
            </div>

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <Button type="submit" disabled={saving}>
              {saving ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 rounded-[22px] border border-[#d8e4ff] bg-[linear-gradient(180deg,#ffffff,#f7f9ff)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Admin onboarding</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  After signing in, use the Users page to create company accounts and the Booking Settings page to configure blocked dates and workweeks.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--accent)]" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
