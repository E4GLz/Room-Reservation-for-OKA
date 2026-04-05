"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="max-w-lg rounded-[28px] border border-rose-200 bg-white px-8 py-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-600">Something went wrong</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">This page could not be loaded.</h2>
        <p className="mt-3 text-sm text-slate-600">
          Check the local environment variables and database setup, then try again.
        </p>
        <div className="mt-6">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
