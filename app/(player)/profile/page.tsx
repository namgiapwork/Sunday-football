import { requirePlayer } from "@/lib/auth/current-user";
import { getPlayerProfile } from "@/lib/data/players";
import { AvatarForm } from "./avatar-form";
import { ProfileForm } from "./profile-form";
import { ChangePinForm } from "./change-pin-form";
import { LogoutButton } from "./logout-button";
import { SectionTitle } from "@/components/ui/card";

export const metadata = { title: "Profile — Sunday Football" };

export default async function ProfilePage() {
  const user = await requirePlayer();
  const profile = await getPlayerProfile(user.player.id);

  return (
    <main className="px-5 py-8">
      <h1 className="mb-1 text-3xl font-black tracking-tight">Your profile</h1>
      <p className="mb-6 text-sm text-chalk-dim">
        Your positions and ratings are used whenever teams get picked next — including this Sunday, if the
        teams are not out yet. Teams that have already gone up keep the ratings they were picked with.
      </p>

      <AvatarForm name={user.player.name} avatarUrl={profile?.avatar_url ?? null} />

      <ProfileForm
        name={user.player.name}
        positions={profile?.positions.map((p) => ({ position: p.position, rating: Math.round(p.rating) })) ?? []}
      />

      <div className="mt-10">
        <SectionTitle className="mb-3">Change your PIN</SectionTitle>
        <ChangePinForm />
      </div>

      <div className="mt-10 border-t border-pitch-800 pt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
