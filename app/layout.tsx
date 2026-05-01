import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LanguageProvider } from "@/components/providers/language-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getAppSettings } from "@/lib/settings";
import { getCurrentSessionUser } from "@/lib/server-auth";
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store';
export const metadata: Metadata = {
  title: "Obeikan Knowledge Academy",
  description: "Obeikan Knowledge Academy room reservation platform for booking control, approvals, visitor agenda, planner operations, users, and reporting."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, user] = await Promise.all([getAppSettings(), getCurrentSessionUser()]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('oka-theme-mode') || 'system';
                  var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = stored === 'system' ? (dark ? 'dark' : 'light') : stored;
                  document.documentElement.dataset.themeMode = stored;
                  document.documentElement.dataset.theme = resolved;
                  document.documentElement.style.colorScheme = resolved;
                } catch (error) {}
              })();
            `
          }}
        />
      </head>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <SessionProvider initialUser={user}>
              <AppShell
                siteTitle={settings.siteTitle}
                siteTitleArabic={"siteTitleArabic" in settings ? settings.siteTitleArabic : null}
                siteDescription={settings.siteDescription}
              >
                {children}
              </AppShell>
            </SessionProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
