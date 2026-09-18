import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isConfigured } from "@/lib/env";
import { BottomNavigation } from "@/components/nav/bottom-navigation";
import { SetupRequired } from "@/components/ui/setup-required";

/**
 * Every page here depends on who is asking, so nothing is prerendered.
 */
export const dynamic = "force-dynamic";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <SetupRequired />;

  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-20">
      {children}
      <BottomNavigation isAdmin={user.role === "admin"} />
    </div>
  );
}
