import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  style,
  onClick
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_20px_40px_-28px_rgba(37,87,229,0.24)] backdrop-blur-sm",
        onClick ? "cursor-pointer transition hover:shadow-[0_24px_48px_-28px_rgba(37,87,229,0.32)]" : "",
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
