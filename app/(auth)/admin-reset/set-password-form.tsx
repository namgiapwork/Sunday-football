"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Stage =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "done" }
  | { kind: "bad"; message: string };

/**
 * Supabase's default email delivers the recovery credential in the URL fragment,
 * which never reaches the server — so the session is established here in the
 * browser, and the password is set with that session.
 */
export function SetPasswordForm() {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();

    async function establish() {
      const hash = new URLSearchParams(window.location.hash.slice(1));

      const errorCode = hash.get("error_code") ?? hash.get("error");
      if (errorCode) {
        history.replaceState(null, "", window.location.pathname);
        setStage({
          kind: "bad",
          message: /expired|invalid/i.test(errorCode)
            ? "That link has already been used or has expired. Ask for a new one and open it straight away."
            : "That link did not work. Ask for a new one.",
        });
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        history.replaceState(null, "", window.location.pathname);
        setStage(sessionError ? { kind: "bad", message: sessionError.message } : { kind: "ready" });
        return;
      }

      // Already signed in — changing your password while logged in is fine too.
      const { data } = await supabase.auth.getUser();
      setStage(
        data.user
          ? { kind: "ready" }
          : {
              kind: "bad",
              message: "Open this page from the link in your reset email.",
            },
      );
    }

    void establish();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });
    setSaving(false);

    if (updateError) return setError(updateError.message);
    setStage({ kind: "done" });
  }

  if (stage.kind === "checking") {
    return <p className="text-sm text-chalk-faint">Checking your link…</p>;
  }

  if (stage.kind === "bad") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">{stage.message}</Alert>
        <Link
          href="/admin-login"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-pitch-800 font-bold text-chalk"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (stage.kind === "done") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">Password changed. You can sign in with it now.</Alert>
        <Link
          href="/admin-login"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-lime font-bold text-pitch-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="New password">
        <Input name="password" type="password" required autoComplete="new-password" minLength={8} autoFocus />
      </Field>
      <Field label="Repeat it">
        <Input name="confirm" type="password" required autoComplete="new-password" minLength={8} />
      </Field>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
