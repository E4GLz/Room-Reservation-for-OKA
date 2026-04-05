import Link from "next/link";
import { ArrowRight, CalendarRange, ClipboardCheck, ShieldCheck, TimerReset, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const featureCards = [
  {
    title: "Excel-style planner",
    description: "Keep the familiar monthly room schedule while improving visibility and reducing manual updates.",
    icon: CalendarRange
  },
  {
    title: "Conflict prevention",
    description: "Prevent double-booking automatically with date and time overlap validation before saving.",
    icon: ShieldCheck
  },
  {
    title: "Operational control",
    description: "Track approvals, blocked dates, food service requests, and room usage from one internal workspace.",
    icon: ClipboardCheck
  },
  {
    title: "User-specific access",
    description: "Give staff a safe schedule and history view while keeping room management and edits on the admin side.",
    icon: Users
  }
];

const highlights = [
  "Monthly, weekly, daily, and list schedule views",
  "Upcoming meeting reminders for admin email delivery",
  "Booking history and status visibility for each user",
  "Business-ready dashboard and reporting structure"
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-[#d8e4ff] bg-[linear-gradient(135deg,#14205b_0%,#2557e5_54%,#9ac0ff_132%)] px-8 py-10 text-white shadow-[0_28px_60px_-36px_rgba(20,32,91,0.9)] lg:px-12 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/72">Building reservation platform</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight lg:text-6xl">
                A clearer way to manage room schedules across the building.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/78">
                Replace monthly spreadsheets and email back-and-forth with a clean internal reservation platform designed for meetings, workshops, training sessions, and offsite events.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button variant="secondary" className="shadow-sm">
                    Go to login
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="ghost" className="bg-white/10 text-white ring-white/20 hover:bg-white/16">
                    Explore features
                  </Button>
                </a>
              </div>
            </div>

            <Card className="border-white/14 bg-white/10 text-white shadow-none backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/68">What the platform helps with</p>
              <div className="mt-5 space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/6 px-4 py-3">
                    <TimerReset className="mt-0.5 h-4 w-4 text-white/78" />
                    <p className="text-sm leading-6 text-white/84">{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section id="features" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">Platform purpose</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Built for teams that already know the schedule matters every day.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              The application keeps the comfort of a room-by-date planning sheet while adding the controls a live internal operation needs: conflict checking, booking history, food-service visibility, reminder emails, and role-based access.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="rounded-[24px] border border-[#d8e4ff] bg-[linear-gradient(180deg,#ffffff,#f5f8ff)] p-5 shadow-[0_16px_36px_-30px_rgba(37,87,229,0.34)]">
                    <div className="inline-flex rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">For staff</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Simple daily experience</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Staff users can check the planner, follow their own booking history, and review statuses without exposing room setup or broader administrative controls.
              </p>
            </Card>

            <Card>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">For operations</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Controlled admin workflow</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Admin users manage rooms, create and adjust bookings, monitor approvals, and receive reminder notifications for upcoming meetings that need preparation.
              </p>
              <div className="mt-6">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                  Continue to sign in
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
