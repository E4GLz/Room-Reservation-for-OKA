import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LanguageProvider } from "@/components/providers/language-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { getAppSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Obeikan Knowledge Academy",
  description: "Obeikan Knowledge Academy room reservation platform for booking control, approvals, visitor agenda, planner operations, users, and reporting."
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
        <LanguageProvider>
          <SessionProvider>
            <AppShell
              siteTitle={settings.siteTitle}
              siteTitleArabic={"siteTitleArabic" in settings ? settings.siteTitleArabic : null}
              siteDescription={settings.siteDescription}
            >
              {children}
            </AppShell>
          </SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
