import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_20px_40px_-28px_rgba(37,87,229,0.24)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
