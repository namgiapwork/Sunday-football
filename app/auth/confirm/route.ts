import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where Supabase sends someone after they click an emailed link. Exchanges the
 * one-time code for a session, then hands them on to set a new password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin-reset";

  if (!code) {
    return NextResponse.redirect(`${origin}/admin-login?error=link`);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/admin-login?error=expired`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
