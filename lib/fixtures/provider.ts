/**
 * A future source of fixtures (an API, a cron importer). Nothing implements this
 * yet: fixtures are entered by an admin. An importer would upsert on
 * (external_source, external_id) from an admin action or an authorised cron route.
 */
export interface ExternalFixture {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  competition?: string;
}

export interface FixtureProvider {
  name: string;
  listUpcoming(): Promise<ExternalFixture[]>;
}
