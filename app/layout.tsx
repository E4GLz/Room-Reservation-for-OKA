import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/providers/session-provider";
import { getAppSettings } from "@/lib/settings";
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store';
export const metadata: Metadata = {
  title: "Internal Room Reservation Platform",
  description: "Company room reservation platform for booking control, approvals, planner operations, users, and reporting."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getAppSettings();

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <AppShell siteTitle={settings.siteTitle} siteDescription={settings.siteDescription}>
            {children}
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
