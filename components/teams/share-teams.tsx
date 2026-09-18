"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Plain text the organiser can paste straight into Messenger (spec §17).
 * The Web Share sheet is used when the browser has one.
 */
export function ShareTeams({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setFailed(true);
    }
  }

  async function share() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ text });
    } catch {
      // The user dismissed the share sheet; nothing to report.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <pre className="max-h-64 overflow-auto rounded-2xl border border-pitch-700 bg-pitch-900 p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={copy} variant="secondary">
          {copied ? "Copied ✓" : "Copy"}
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <Button type="button" onClick={share} variant="secondary">
            Share
          </Button>
        ) : null}
      </div>

      {failed ? (
        <p className="text-xs text-kit-yellow">
          Your browser would not let the app copy. Select the text above and copy it by hand.
        </p>
      ) : null}
    </div>
  );
}
