import { Card, CardBody } from "./card";

/** Shown instead of a crash when the Supabase environment is not configured yet. */
export function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-5">
      <h1 className="text-3xl font-black tracking-tight">Sunday Football</h1>
      <Card>
        <CardBody className="pt-4 text-sm leading-relaxed text-chalk-dim">
          <p className="mb-3 font-semibold text-chalk">This app is not connected to a database yet.</p>
          <p className="mb-3">
            Copy <code className="rounded bg-pitch-800 px-1">.env.example</code> to{" "}
            <code className="rounded bg-pitch-800 px-1">.env.local</code>, fill in the Supabase URL and keys,
            then run the migrations and the seed.
          </p>
          <p>The README walks through it step by step.</p>
        </CardBody>
      </Card>
    </main>
  );
}
