import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isConfigured } from "@/lib/env";
import { AdminNavigation } from "@/components/nav/admin-navigation";
import { Alert } from "@/components/ui/alert";
import { SetupRequired } from "@/components/ui/setup-required";

/**
 * Every page here depends on who is asking, so nothing is prerendered.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <SetupRequired />;

  const user = await getCurrentUser();

  // Admin rights come from the email login, never from a PIN session (spec §78).
  if (!user?.strongAuth) redirect("/admin-login");

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Alert tone="error">You do not have permission to manage this football group.</Alert>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <AdminNavigation />
      <div className="mx-auto max-w-3xl px-5 py-6">{children}</div>
    </div>
  );
}
