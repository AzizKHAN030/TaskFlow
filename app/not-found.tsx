import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center p-6">
      <div className="w-full rounded-lg border bg-white p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold">Page not found</h1>
        <p className="mb-4 text-sm text-muted-foreground">The page you requested does not exist.</p>
        <Button asChild>
          <Link href="/projects">Go to Projects</Link>
        </Button>
      </div>
    </main>
  );
}
