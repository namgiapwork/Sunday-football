import { requirePlayer } from "@/lib/auth/current-user";
import { getPlayerProfile } from "@/lib/data/players";
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
        Changing your positions or ratings affects future Sundays. Teams already published stay as they are.
      </p>

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
