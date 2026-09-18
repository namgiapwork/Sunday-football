import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth/current-user";
import { getPlayerProfile } from "@/lib/data/players";
import { POSITION_LABELS } from "@/lib/teams/positions";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/position-badge";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const viewer = await requirePlayer();
  const profile = await getPlayerProfile(playerId);

  if (!profile) notFound();

  const isSelf = viewer.player.id === profile.id;
  // Ratings belong to the player and the organisers, nobody else (spec §76).
  const maySeeRatings = isSelf || viewer.role === "admin";

  return (
    <main className="px-5 py-8">
      <div className="flex items-center gap-4">
        <PlayerAvatar name={profile.name} avatarUrl={profile.avatar_url} size="xl" />
        <div>
          <h1 className="text-3xl font-black tracking-tight">{profile.name}</h1>
          {profile.role !== "player" ? (
            <p className="text-sm font-semibold text-lime capitalize">{profile.role}</p>
          ) : null}
          {!profile.is_active ? <p className="text-sm text-chalk-faint">No longer playing</p> : null}
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle className="mb-3">Preferred positions</SectionTitle>
        {profile.positions.length === 0 ? (
          <p className="text-sm text-chalk-faint">No positions saved yet.</p>
        ) : (
          <Card>
            <CardBody className="pt-4">
              <ul className="flex flex-col gap-2">
                {profile.positions.map((position) => (
                  <li key={position.position} className="flex items-baseline justify-between">
                    <span>
                      <span className="font-bold">{position.position}</span>
                      <span className="ml-2 text-sm text-chalk-faint">
                        {POSITION_LABELS[position.position]}
                      </span>
                    </span>
                    {maySeeRatings ? <RatingBadge rating={position.rating} /> : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      {isSelf ? (
        <Link
          href="/profile"
          className="mt-6 inline-block text-sm font-semibold text-lime underline-offset-4 hover:underline"
        >
          Edit profile
        </Link>
      ) : null}
    </main>
  );
}
