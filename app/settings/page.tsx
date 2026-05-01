import { SettingsPage } from "@/components/settings/settings-page";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdminPageUser } from "@/lib/server-auth";
import { getAppSettings } from "@/lib/settings";
import { AppSettingsRecord } from "@/lib/types";
import { serializeSettings } from "@/lib/utils";

export default async function Settings() {
  await requireAdminPageUser();
  const settings = await getAppSettings();
  const appSetting = serializeSettings(settings) as AppSettingsRecord;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Booking Settings"
        description="Manage blocked booking dates, workweek layout, and shared platform labels used across the reservation system."
      />
      <SettingsPage settings={appSetting} />
    </>
  );
}
