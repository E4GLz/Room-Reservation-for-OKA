"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/providers/session-provider";

export function LoginPage() {
  const router = useRouter();
  const { setSessionUser } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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

    setSessionUser(payload.user, { remember: rememberMe });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-[480px] rounded-[30px] border border-[#d8e4ff] bg-white shadow-[0_28px_60px_-38px_rgba(37,87,229,0.3)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">User access</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Sign in</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          Enter your company email and password to access the reservation workspace.
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

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setError("Please contact the administrator to reset your password.")}
              className="font-medium text-[var(--accent)] transition hover:text-[#2048bc]"
            >
              Forgot password?
            </button>
          </div>

          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--line)] pt-5 text-sm text-slate-500">
          <Link href="/" className="font-medium text-[var(--accent)] transition hover:text-[#2048bc]">
            Back to homepage
          </Link>
        </div>
      </Card>
    </div>
  );
}
