import { requireAdmin } from "@/lib/auth/current-user";
import { getGroup, listVenues } from "@/lib/data/groups";
import { formatTimeRange } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { VenueForm } from "./venue-form";

export const metadata = { title: "Settings — Admin" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const group = await getGroup();
  if (!group) return <Alert tone="warning">This football group has not been set up yet.</Alert>;

  const venues = await listVenues(group.id);
  const defaultVenue = venues.find((v) => v.id === group.default_venue_id);

  return (
    <>
      <h1 className="mb-6 text-2xl font-black tracking-tight">Settings</h1>

      <Card className="mb-8">
        <CardBody className="pt-4">
          <SectionTitle className="mb-3">Group</SectionTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-chalk-faint">Name</dt>
            <dd className="font-semibold">{group.name}</dd>
            <dt className="text-chalk-faint">Timezone</dt>
            <dd className="font-semibold">{group.timezone}</dd>
            <dt className="text-chalk-faint">Usual time</dt>
            <dd className="tabular font-semibold">
              {formatTimeRange(group.default_start_time, group.default_end_time)}
            </dd>
            <dt className="text-chalk-faint">Usual venue</dt>
            <dd className="font-semibold">{defaultVenue?.name ?? "Not set"}</dd>
          </dl>
          <p className="mt-3 text-xs text-chalk-faint">
            These are the defaults a new Sunday starts with. Change any of them per Sunday when you create it.
          </p>
        </CardBody>
      </Card>

      <SectionTitle className="mb-3">Venues</SectionTitle>
      {venues.length === 0 ? (
        <Alert tone="info">No venues yet. Add the pitch you normally play on.</Alert>
      ) : (
        <ul className="mb-6 flex flex-col gap-2">
          {venues.map((venue) => (
            <li key={venue.id} className="rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3">
              <p className="font-semibold">{venue.name}</p>
              {venue.address ? <p className="text-sm text-chalk-dim">{venue.address}</p> : null}
              {venue.notes ? <p className="text-sm text-chalk-faint">{venue.notes}</p> : null}
              {venue.maps_url ? (
                <a
                  href={venue.maps_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-sm font-semibold text-lime underline-offset-4 hover:underline"
                >
                  Open in Maps
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <SectionTitle className="mb-3">Add a venue</SectionTitle>
        <VenueForm />
      </div>
    </>
  );
}
