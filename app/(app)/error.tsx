"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
      <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
