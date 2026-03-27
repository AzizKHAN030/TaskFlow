import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold">Not found</h2>
      <p className="mb-4 text-sm text-muted-foreground">The requested project does not exist or is inaccessible.</p>
      <Button asChild>
        <Link href="/projects">Go to Projects</Link>
      </Button>
    </div>
  );
}
