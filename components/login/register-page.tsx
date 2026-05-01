"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, KeyRound, UserPlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/components/providers/language-provider";
import { readErrorMessage, extractFlattenedFormError } from "@/lib/client-errors";
import { combinePhoneNumber, COUNTRY_CODE_OPTIONS } from "@/lib/phone";

const valuePoints = [
  "Access the live room schedule",
  "Follow your own booking history",
  "Receive booking status visibility"
];

export function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    email: "",
    countryCode: "+966",
    localPhoneNumber: "",
    password: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const passwordChecks = [
    { label: "At least 8 characters", met: form.password.length >= 8 },
    { label: "Contains an uppercase letter", met: /[A-Z]/.test(form.password) },
    { label: "Contains a lowercase letter", met: /[a-z]/.test(form.password) },
    { label: "Contains a number", met: /\d/.test(form.password) },
    { label: "Contains a special character", met: /[^A-Za-z0-9]/.test(form.password) }
  ];
  const metPasswordChecks = passwordChecks.filter((item) => item.met).length;
  const passwordStrength =
    form.password.length === 0
      ? { label: "Not set", tone: "bg-slate-200", text: "text-slate-500", width: "0%" }
      : metPasswordChecks <= 2
        ? { label: "Weak", tone: "bg-rose-500", text: "text-rose-700", width: "33%" }
        : metPasswordChecks <= 4
          ? { label: "Good", tone: "bg-amber-500", text: "text-amber-700", width: "66%" }
          : { label: "Strong", tone: "bg-emerald-500", text: "text-emerald-700", width: "100%" };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phoneNumber: combinePhoneNumber(form.countryCode, form.localPhoneNumber),
          password: form.password,
          confirmPassword: form.confirmPassword
        })
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, t("Unable to create account."), extractFlattenedFormError));
        setSaving(false);
        return;
      }

      const payload = await response.json();
      setSuccess(payload.message || t("Account created successfully."));
      setSaving(false);
      window.setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("Unable to create account."));
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="overflow-hidden rounded-[34px] border border-[#d8e4ff] bg-[linear-gradient(135deg,#14205b_0%,#2557e5_52%,#8fb5ff_132%)] px-8 py-10 text-white shadow-[0_32px_72px_-42px_rgba(20,32,91,0.88)] lg:px-12 lg:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-[26px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm">
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
              {t("Create your account and join the reservation workspace.")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/80">
              {t("Register with your company details to access the planner, review your booking history, and follow reservation statuses from one place.")}
            </p>

            <div className="mt-8 grid gap-3">
              {valuePoints.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 px-4 py-3">
                  <BadgeCheck className="h-4 w-4 text-white/84" />
                  <p className="text-sm text-white/86">{t(item)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="w-full rounded-[32px] border border-[#d8e4ff] bg-white p-7 shadow-[0_28px_60px_-38px_rgba(37,87,229,0.28)] lg:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
              <UserPlus2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("New user access")}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{t("Register")}</h2>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {t("Fill in your details to request a staff account. Room setup and advanced controls remain managed by the admin team.")}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Full name")}</label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Company email")}</label>
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("Phone number")}</label>
              <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
                <Select value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value })}>
                  {COUNTRY_CODE_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  inputMode="tel"
                  value={form.localPhoneNumber}
                  onChange={(event) => setForm({ ...form, localPhoneNumber: event.target.value.replace(/[^\d]/g, "") })}
                  placeholder={t("Local phone number")}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("Password")}</label>
                <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("Confirm password")}</label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                />
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{t("Password strength")}</p>
                <p className={`text-sm font-semibold ${passwordStrength.text}`}>{t(passwordStrength.label)}</p>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-slate-200">
                <div
                  className={`h-2.5 rounded-full ${passwordStrength.tone}`}
                  style={{ width: passwordStrength.width }}
                />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {passwordChecks.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.met ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className={item.met ? "text-slate-800" : "text-slate-500"}>{t(item.label)}</span>
                  </div>
                ))}
              </div>
            </div>

            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? t("Submitting request...") : t("Request account")}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5 text-sm">
            <Link href="/login" className="font-medium text-[var(--accent)] transition hover:text-[#2048bc]">
              {t("Already have an account? Sign in")}
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 font-medium text-slate-500 transition hover:text-slate-700">
              {t("Back to homepage")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
