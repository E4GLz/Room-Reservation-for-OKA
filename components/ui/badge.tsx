import { cn, getStatusTone } from "@/lib/utils";

export function Badge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", tone ?? getStatusTone(label))}>
      {label}
    </span>
  );
}
