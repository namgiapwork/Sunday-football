/**
 * Sign-in pages read cookies to bounce an already-signed-in player onwards, so
 * they are rendered per request rather than prerendered.
 */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
