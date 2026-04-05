import { ProfilePage } from "@/components/profile/profile-page";
import { PageHeader } from "@/components/ui/page-header";

export default function Profile() {
  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile Settings"
        description="Update your contact details, change your password, and manage your current sign-in profile."
      />
      <ProfilePage />
    </>
  );
}
