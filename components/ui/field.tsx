import type { ComponentProps, ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-chalk">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-chalk-faint">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-kit-red">{error}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`h-12 w-full rounded-xl border border-pitch-700 bg-pitch-850 px-3 text-chalk
        placeholder:text-chalk-faint focus:border-lime focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`h-12 w-full appearance-none rounded-xl border border-pitch-700 bg-pitch-850 px-3
        text-chalk focus:border-lime focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`w-full rounded-xl border border-pitch-700 bg-pitch-850 px-3 py-2 text-chalk
        placeholder:text-chalk-faint focus:border-lime focus:outline-none ${className}`}
      {...props}
    />
  );
}
