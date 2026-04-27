"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarClock,
  CalendarRange,
  CircleUserRound,
  ClipboardList,
  CupSoda,
  Languages,
  LayoutDashboard,
  LogIn,
  LogOut,
  MonitorCog,
  MoonStar,
  Settings,
  SunMedium,
  UserCog,
  History
} from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { PageTransition } from "@/components/layout/page-transition";
import { useTheme } from "@/components/providers/theme-provider";


type NavigationItem = {
  href: any;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  role: "PUBLIC" | "AUTH" | "MANAGER" | "ADMIN" | "SERVICE" | "ADMIN_SERVICE";
};
const navigation: NavigationItem[] = [
  { href: "/login", label: "Login", icon: LogIn, role: "PUBLIC" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, role: "PUBLIC" },
  { href: "/planner", label: "Planner", icon: CalendarRange, role: "PUBLIC" },
  { href: "/my-bookings", label: "My Bookings", icon: History, role: "AUTH" },
  { href: "/approvals", label: "Approvals", icon: Bell, role: "MANAGER" },
  { href: "/hospitality", label: "Hospitality", icon: CupSoda, role: "ADMIN_SERVICE" },
  { href: "/service", label: "Service", icon: CupSoda, role: "SERVICE" },
  { href: "/rooms", label: "Rooms", icon: Building2, role: "ADMIN" },
  { href: "/reports", label: "Reports", icon: ClipboardList, role: "ADMIN" },
  { href: "/users", label: "Users", icon: UserCog, role: "ADMIN" },
  { href: "/settings", label: "Settings", icon: Settings, role: "ADMIN" }
] as const;

export function AppShell({
  children,
  siteTitle,
  siteTitleArabic,
  siteDescription
}: {
  children: React.ReactNode;
  siteTitle: string;
  siteTitleArabic?: string | null;
  siteDescription: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useSession();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [now, setNow] = useState(() => new Date());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const userRole = user?.role as string | undefined;
  const displayName = user?.name ? toTitleCase(user.name) : t("Guest");
  const firstName = displayName.split(" ")[0] ?? t("Guest");
  const displaySiteTitle = language === "ar" && siteTitleArabic ? siteTitleArabic : siteTitle;
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/guest-order");
  const visibleNavigation = navigation.filter((item) => {
    if (userRole === "SERVICE") {
      return item.role === "SERVICE" || item.role === "ADMIN_SERVICE";
    }

    if (item.href === "/login" && user?.email) {
      return false;
    }

    if (item.role === "ADMIN") {
      return userRole === "ADMIN";
    }

    if (item.role === "ADMIN_SERVICE") {
      return userRole === "ADMIN" || userRole === "SERVICE";
    }

    if (item.role === "AUTH") {
      return Boolean(user?.email) && userRole !== "SERVICE";
    }

    if (item.role === "MANAGER") {
      return userRole === "MANAGER" || userRole === "ADMIN";
    }

    if (item.role === "SERVICE") {
      return userRole === "SERVICE";
    }

    return true;
  });
  const todayLabel = new Intl.DateTimeFormat(language === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
  const themeLabel = theme === "light" ? t("Light") : theme === "dark" ? t("Dark") : t("System");
  const ThemeIcon = theme === "light" ? SunMedium : theme === "dark" ? MoonStar : MonitorCog;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileMenuRef.current) {
        if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
          setThemeMenuOpen(false);
        }
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }

      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    }

    if (profileMenuOpen || themeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen, themeMenuOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setProfileMenuOpen(false);
    window.location.assign("/login");
  }

  if (isPublicRoute) {
    return (
      <main className="min-h-screen bg-[var(--public-bg)]">
        <div className="fixed right-6 top-6 z-20 flex items-center gap-3">
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setThemeMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-elevated)] px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)] ring-1 ring-[var(--line)] transition"
            >
              <ThemeIcon className="h-4 w-4 text-[var(--accent)]" />
              {themeLabel}
            </button>

            {themeMenuOpen ? (
              <ThemeMenu
                currentTheme={theme}
                onSelect={(nextTheme) => {
                  setTheme(nextTheme);
                  setThemeMenuOpen(false);
                }}
                t={t}
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-elevated)] px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)] ring-1 ring-[var(--line)] transition"
          >
            <Languages className="h-4 w-4 text-[var(--accent)]" />
            {language === "en" ? "AR" : "EN"}
          </button>
        </div>
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {isSigningOut ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--surface)]/92 backdrop-blur-sm">
          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel-elevated)] px-8 py-7 text-center shadow-[0_28px_60px_-36px_rgba(15,23,42,0.32)]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("Signing off")}</p>
            <p className="mt-3 text-lg font-semibold text-[var(--ink)]">{t("Closing your session securely...")}</p>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid min-h-screen max-w-[1850px] grid-cols-1 gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[32px] px-5 py-6 text-white shadow-[0_28px_60px_-36px_rgba(16,23,67,0.9)]" style={{ background: "var(--sidebar-bg)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <Image
                src="/branding/oka-logo-white.png"
                alt="Obeikan Knowledge Academy"
                width={40}
                height={40}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/60">OKA</p>
              <h1 className="text-xl font-semibold tracking-tight">{displaySiteTitle}</h1>
            </div>
          </div>

          <div className="mt-8 rounded-[26px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/58">{t("Signed in as")}</p>
            <p className="mt-2 text-base font-medium text-white">{displayName}</p>
            <p className="text-sm text-white/70">{user?.email ?? t("No active session")}</p>
            <span className="mt-3 inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/14">
              {user?.email ? t("Active session") : t("No role")}
            </span>
          </div>

          <nav className="mt-8 space-y-2">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href) && (item.href !== "/login" || pathname === "/login");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-[rgba(111,149,255,0.28)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-white/78 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[22px] border border-white/10 bg-black/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">{t("Internal operations")}</p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              {language === "ar" ? t(siteDescription) : siteDescription}
            </p>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[32px] border border-[var(--line)] bg-[var(--panel)] shadow-[0_28px_64px_-40px_rgba(37,87,229,0.3)]">
          <header className="flex flex-col gap-4 border-b border-[var(--line)] bg-[var(--header-bg)] px-8 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("Building operations")}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ink)]">
                {t("Good morning,")} {firstName}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" ref={themeMenuRef}>
                <button
                  type="button"
                  onClick={() => setThemeMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-elevated)] px-4 py-2 text-sm font-medium text-[var(--ink)] ring-1 ring-[var(--line)] transition"
                >
                  <ThemeIcon className="h-4 w-4 text-[var(--accent)]" />
                  {themeLabel}
                </button>

                {themeMenuOpen ? (
                  <ThemeMenu
                    currentTheme={theme}
                    onSelect={(nextTheme) => {
                      setTheme(nextTheme);
                      setThemeMenuOpen(false);
                    }}
                    t={t}
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-elevated)] px-4 py-2 text-sm font-medium text-[var(--ink)] ring-1 ring-[var(--line)] transition"
              >
                <Languages className="h-4 w-4 text-[var(--accent)]" />
                {language === "en" ? "AR" : "EN"}
              </button>

              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent)] ring-1 ring-[var(--line)]">
                <CalendarClock className="h-4 w-4" />
                {todayLabel}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-elevated)] px-4 py-2 text-sm font-medium text-[var(--ink)] ring-1 ring-[var(--line)]">
                {displayName}
              </span>

              <Link
                href={
                  userRole === "ADMIN"
                    ? "/dashboard"
                    : userRole === "MANAGER"
                      ? "/approvals"
                      : userRole === "SERVICE"
                        ? "/service"
                        : "/my-bookings"
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--panel-elevated)] text-[var(--ink)] ring-1 ring-[var(--line)] transition"
              >
                <Bell className="h-4 w-4 text-[var(--accent)]" />
              </Link>

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--line)] transition"
                >
                  <CircleUserRound className="h-5 w-5" />
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 top-12 z-20 min-w-[220px] rounded-[22px] border border-[var(--line)] bg-[var(--panel-elevated)] p-2 shadow-[0_22px_46px_-28px_rgba(15,23,42,0.35)]">
                    <div className="border-b border-[var(--line)] px-3 py-3">
                      <p className="text-sm font-semibold text-[var(--ink)]">{displayName}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{user?.email ?? t("No active session")}</p>
                    </div>

                    <div className="pt-2">
                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                      >
                        <Settings className="h-4 w-4 text-[var(--accent)]" />
                        {t("Open settings")}
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-soft)]"
                      >
                        <LogOut className="h-4 w-4 text-[var(--accent)]" />
                        {t("Sign off")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex-1 bg-[var(--main-bg)]">
            <PageTransition>{children}</PageTransition>
          </main>
        </section>
      </div>
    </div>
  );
}

function ThemeMenu({
  currentTheme,
  onSelect,
  t
}: {
  currentTheme: "light" | "dark" | "system";
  onSelect: (theme: "light" | "dark" | "system") => void;
  t: (text: string) => string;
}) {
  const items = [
    { value: "light" as const, label: t("Light"), icon: SunMedium },
    { value: "dark" as const, label: t("Dark"), icon: MoonStar },
    { value: "system" as const, label: t("System"), icon: MonitorCog }
  ];

  return (
    <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-[22px] border border-[var(--line)] bg-[var(--panel-elevated)] p-2 shadow-[0_22px_46px_-28px_rgba(15,23,42,0.35)]">
      {items.map((item) => {
        const Icon = item.icon;
        const active = currentTheme === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-sm font-medium transition",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--ink)] hover:bg-[var(--panel-soft)]"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
