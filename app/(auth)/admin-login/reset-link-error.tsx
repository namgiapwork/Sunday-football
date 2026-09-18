import { Alert } from "@/components/ui/alert";

const MESSAGES: Record<string, string> = {
  expired:
    "That reset link has already been used or has expired. Request a new one below and open it as soon as it arrives.",
  invalid: "That reset link was not valid. Request a new one below.",
  missing: "That link was incomplete. Request a new one below.",
  link: "That reset link did not work. Request a new one below.",
};

/** Explains a failed link instead of dropping somebody on a bare sign-in form. */
export function ResetLinkError({ reason }: { reason?: string }) {
  if (!reason) return null;

  return (
    <div className="mb-5">
      <Alert tone="error">{MESSAGES[reason] ?? MESSAGES.invalid}</Alert>
    </div>
  );
}
