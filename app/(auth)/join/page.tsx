import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/setup-required";
import { JoinForm } from "./join-form";

export default async function JoinPage() {
  if (!isConfigured()) return <SetupRequired />;

  const user = await getCurrentUser();
  if (user) redirect("/home");

  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <Link href="/" className="text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Join the group</h1>
      <p className="mt-1 mb-6 text-sm text-chalk-dim">
        Takes a minute. You only do this once — after that it is one tap each week.
      </p>

      <JoinForm />
    </main>
  );
}
