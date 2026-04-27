import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[16px] px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[var(--accent)] text-white shadow-[0_12px_24px_-16px_rgba(37,87,229,0.9)] hover:bg-[#2048bc]",
        variant === "secondary" && "bg-[var(--button-secondary)] text-[var(--ink)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--button-secondary-hover)]",
        variant === "ghost" && "bg-[var(--button-ghost)] text-[var(--accent)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--button-ghost-hover)]",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
