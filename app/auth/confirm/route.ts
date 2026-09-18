import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Where an emailed link lands. Supabase can deliver the credential two ways:
 * a `token_hash` we verify here (what our templates use — it works entirely
 * server-side), or a PKCE `code` we exchange. Both are handled so a link keeps
 * working if the template is ever changed back.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/admin-reset";

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await supabaseServer();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/admin-login?error=${reason(error.message)}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/admin-login?error=${reason(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/admin-login?error=missing`);
}

function reason(message: string): string {
  return /expired/i.test(message) ? "expired" : "invalid";
}
