import Link from "next/link";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/setup-required";
import { SetPasswordForm } from "./set-password-form";

export const metadata = { title: "New password — Sunday Football" };

export default function AdminResetPage() {
  if (!isConfigured()) return <SetupRequired />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <h1 className="text-3xl font-black tracking-tight">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-chalk-dim">At least 8 characters.</p>

      <SetPasswordForm />

      <Link
        href="/admin-login"
        className="mt-6 text-center text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </main>
  );
}
