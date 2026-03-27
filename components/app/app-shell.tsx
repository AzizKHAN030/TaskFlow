import { CheckSquare } from "lucide-react";
import { LogoutButton } from "@/components/app/logout-button";
import { SidebarNav } from "@/components/app/sidebar-nav";

export function AppShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) {
  return (
    <div className="flex min-h-screen w-full bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-950 dark:to-slate-900">
      <aside className="sticky top-0 hidden h-screen w-64 border-r bg-white/90 dark:bg-slate-900/95 lg:block">
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-md bg-primary p-2 text-primary-foreground">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">TaskFlow</p>
              <p className="text-xs text-muted-foreground">Task Management</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SidebarNav />
          </div>

          <div className="mt-4 rounded-lg border bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-sm font-medium">{user.name ?? "Google User"}</p>
            <p className="mb-3 truncate text-xs text-muted-foreground">{user.email}</p>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 lg:px-8">
            <p className="text-sm font-semibold">TaskFlow Dashboard</p>
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
