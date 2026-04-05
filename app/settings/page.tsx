import { SettingsPage } from "@/components/settings/settings-page";
import { PageHeader } from "@/components/ui/page-header";
import { getAppSettings } from "@/lib/settings";
import { serializeSettings } from "@/lib/utils";

export default async function Settings() {
  const settings = await getAppSettings();

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Booking Settings"
        description="Manage blocked booking dates, workweek layout, and shared platform labels used across the reservation system."
      />
      <SettingsPage settings={serializeSettings(settings)} />
    </>
  );
}
