import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        props.className
      )}
    />
  );
}
