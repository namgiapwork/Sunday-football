import Link from "next/link";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/setup-required";
import { AdminLoginForm } from "./admin-login-form";
import { ResetLinkError } from "./reset-link-error";

export const metadata = { title: "Admin sign in — Sunday Football" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!isConfigured()) return <SetupRequired />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <h1 className="text-3xl font-black tracking-tight">Organiser sign in</h1>
      <p className="mt-1 mb-6 text-sm text-chalk-dim">
        Running a Sunday needs the email login, not a 4-digit PIN.
      </p>

      <ResetLinkError reason={error} />

      <AdminLoginForm />

      <Link href="/" className="mt-6 text-center text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline">
        Player sign in
      </Link>
    </main>
  );
}
