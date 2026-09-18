"use client";

import { useRef, useState } from "react";

/**
 * Four separate boxes so the PIN is readable at a glance on a phone, backed by a
 * single hidden field so it posts like any other form value.
 */
export function PinInput({
  name = "pin",
  autoFocus = false,
  onComplete,
}: {
  name?: string;
  autoFocus?: boolean;
  onComplete?: (pin: string) => void;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function update(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 3) refs.current[index + 1]?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(""));
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    const next = ["", "", "", ""].map((_, i) => pasted[i] ?? "");
    setDigits(next);
    refs.current[Math.min(pasted.length, 3)]?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(""));
  }

  return (
    <div className="flex gap-3">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => update(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`PIN digit ${index + 1}`}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          className="h-16 w-full rounded-2xl border border-pitch-700 bg-pitch-850 text-center text-2xl
            font-bold text-chalk caret-lime focus:border-lime focus:outline-none"
        />
      ))}
    </div>
  );
}
