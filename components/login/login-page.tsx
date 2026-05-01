"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { readErrorMessage } from "@/lib/client-errors";

export function LoginPage() {
  const router = useRouter();
  const { setSessionUser } = useSession();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember: rememberMe })
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, t("Unable to sign in.")));
        setSaving(false);
        return;
      }

      const payload = await response.json();
      setSessionUser(payload.user, { remember: rememberMe });
      router.push(
        payload.user.role === "SERVICE"
          ? "/service"
          : payload.user.role === "MANAGER"
            ? "/approvals"
            : "/dashboard"
      );
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("Unable to sign in."));
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-[1240px] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section
          className="overflow-hidden rounded-[34px] border border-white/18 px-8 py-10 text-white shadow-[0_32px_72px_-42px_rgba(20,32,91,0.88)] lg:px-12 lg:py-14"
          style={{ background: "var(--hero-home-banner-bg)" }}
        >
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-[26px] border border-white/14 bg-white/12 px-5 py-4 shadow-[0_20px_40px_-28px_rgba(8,15,54,0.9)] backdrop-blur-sm">
              <Image
                src="/branding/oka-logo-white.png"
                alt="Obeikan Knowledge Academy"
                width={186}
                height={62}
                className="h-14 w-auto object-contain"
                priority
              />
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.32em] text-white/72">{t("Obeikan Knowledge Academy")}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-5xl">
              {t("Sign in to manage and follow room reservations.")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/80">
              {t("Access the planner, track your booking history, and manage approvals from the academy reservation platform.")}
            </p>
          </div>
        </section>

        <Card className="w-full rounded-[30px] border border-[var(--line)] bg-[var(--panel-elevated)] p-7 shadow-[0_28px_60px_-38px_rgba(37,87,229,0.18)] lg:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("User access")}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">{t("Sign in")}</h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            {t("Enter your company email and password to access the reservation workspace.")}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">{t("Email")}</label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--ink)]">{t("Password")}</label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="inline-flex items-center gap-2 text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                {t("Remember me")}
              </label>
              <button
                type="button"
                onClick={() => setError(t("Please contact the administrator to reset your password."))}
                className="font-medium text-[var(--accent)] transition hover:text-[#2048bc]"
              >
                {t("Forgot password?")}
              </button>
            </div>

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <Button
              type="submit"
              disabled={saving}
              variant="primary"
              className={resolvedTheme === "dark" ? "w-full dark-mode-white-button" : "w-full"}
            >
              {saving ? t("Signing in...") : t("Sign in")}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)]">
            <Link href="/" className="font-medium text-[var(--accent)] transition hover:text-[#2048bc]">
              {t("Back to homepage")}
            </Link>
            <Link href="/register" className="font-medium text-[var(--accent)] transition hover:text-[#2048bc]">
              {t("Create a new account")}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
