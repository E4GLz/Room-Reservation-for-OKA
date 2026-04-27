import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  style
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_20px_40px_-28px_rgba(37,87,229,0.24)] backdrop-blur-sm",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
