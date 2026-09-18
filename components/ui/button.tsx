import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-lime text-pitch-950 hover:bg-lime-dark active:bg-lime-dark",
  secondary: "bg-pitch-800 text-chalk hover:bg-pitch-700 active:bg-pitch-700",
  ghost: "bg-transparent text-chalk-dim hover:text-chalk hover:bg-pitch-850",
  danger: "bg-kit-red/15 text-kit-red hover:bg-kit-red/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-base rounded-xl",
  lg: "h-14 px-5 text-lg rounded-2xl",
  // Pitch-side: tappable at arm's length without looking (spec §88).
  xl: "h-20 px-6 text-2xl rounded-3xl",
};

function classes(variant: Variant, size: Size, className?: string) {
  return [
    "inline-flex items-center justify-center gap-2 font-semibold tracking-tight",
    "transition-colors disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime",
    VARIANTS[variant],
    SIZES[size],
    className ?? "",
  ].join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={classes(variant, size, className)} {...props} />;
}
