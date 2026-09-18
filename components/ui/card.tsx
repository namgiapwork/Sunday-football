import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-pitch-700 bg-pitch-900 ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`px-4 pt-4 pb-2 ${className}`} {...props} />;
}

export function CardBody({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`px-4 pb-4 ${className}`} {...props} />;
}

export function SectionTitle({ className = "", ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={`text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint ${className}`}
      {...props}
    />
  );
}
