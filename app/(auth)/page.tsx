import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { listPlayerNames } from "@/lib/data/players";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/setup-required";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!isConfigured()) return <SetupRequired />;

  const user = await getCurrentUser();
  if (user) redirect("/home");

  const group = await getGroup();
  const players = group ? await listPlayerNames(group.id) : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime">{group?.name ?? "Football"}</p>
        <h1 className="mt-1 text-4xl font-black leading-none tracking-tight">
          Sign up.
          <br />
          Get your team.
          <br />
          Play.
        </h1>
      </header>

      <LoginForm players={players} />
    </main>
  );
}
