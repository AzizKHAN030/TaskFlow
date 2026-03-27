import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CalendarToolbar({
  title,
  prevHref,
  nextHref,
  centerHref,
  centerLabel
}: {
  title: string;
  prevHref: string;
  nextHref: string;
  centerHref?: string;
  centerLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={prevHref}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Link>
        </Button>
        {centerHref && centerLabel ? (
          <Button asChild size="sm" variant="outline">
            <Link href={centerHref}>{centerLabel}</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link href={nextHref}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
