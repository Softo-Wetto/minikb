import ProfileSettingsForm from "@/components/profile-settings-form";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const profile = await requireUser();

  return (
    <div className="space-y-4">
      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
