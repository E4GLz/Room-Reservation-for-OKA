"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CalendarRange,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  Settings,
  UserCog,
  PanelsTopLeft
} from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";
import { useSession } from "@/components/providers/session-provider";

const navigation = [
  { href: "/login", label: "Login", icon: LogIn },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Planner", icon: CalendarRange },
  { href: "/rooms", label: "Rooms", icon: Building2 },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/users", label: "Users", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true }
] as const;

export function AppShell({
  children,
  siteTitle,
  siteDescription
}: {
  children: React.ReactNode;
  siteTitle: string;
  siteDescription: string;
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const displayName = user?.name ? toTitleCase(user.name) : "Guest";
  const firstName = displayName.split(" ")[0] ?? "Guest";
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || user?.role === "ADMIN");
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="mx-auto grid min-h-screen max-w-[1850px] grid-cols-1 gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-[32px] bg-[linear-gradient(180deg,#161d67_0%,#1a2375_58%,#1f2b85_100%)] px-5 py-6 text-white shadow-[0_28px_60px_-36px_rgba(16,23,67,0.9)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 text-white ring-1 ring-white/15">
              <PanelsTopLeft className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/60">Nawras</p>
              <h1 className="text-xl font-semibold tracking-tight">{siteTitle}</h1>
            </div>
          </div>

          <div className="mt-8 rounded-[26px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/58">Signed in as</p>
            <p className="mt-2 text-base font-medium text-white">{displayName}</p>
            <p className="text-sm text-white/70">{user?.email ?? "No active session"}</p>
            <span className="mt-3 inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/14">
              {user?.role ?? "No role"}
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
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[22px] border border-white/10 bg-black/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">Internal operations</p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              {siteDescription}
            </p>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_64px_-40px_rgba(37,87,229,0.3)]">
          <header className="flex flex-col gap-4 border-b border-[var(--line)] bg-[rgba(255,255,255,0.96)] px-8 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.24em] text-[var(--accent)]">Building operations</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Good morning, {firstName}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-medium text-[var(--accent)] ring-1 ring-[#d8e4ff]">
                <CalendarDays className="h-4 w-4" />
                {todayLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-[var(--line)]">
                <Bell className="h-4 w-4 text-[var(--accent)]" />
                {user?.role ?? "Guest"}
              </span>
              <Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[#d8e4ff] transition hover:bg-[#dbe6ff]">
                <CircleUserRound className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <main className="flex-1 bg-[linear-gradient(180deg,rgba(247,249,254,0.8),rgba(239,244,252,0.64))]">
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}
