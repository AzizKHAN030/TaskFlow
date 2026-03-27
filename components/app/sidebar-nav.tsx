"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, FolderKanban, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

function getProjectId(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

function getCurrentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function SidebarNav() {
  const pathname = usePathname();
  const projectId = getProjectId(pathname);
  const currentMonth = getCurrentYearMonth();

  const links = [
    { key: "projects", href: "/projects", label: "Projects", icon: FolderKanban },
    {
      key: "week",
      href: projectId ? `/projects/${projectId}/week` : "/projects",
      label: "Week View",
      icon: CalendarRange
    },
    {
      key: "month",
      href: projectId ? `/projects/${projectId}/month?month=${currentMonth}` : "/projects",
      label: "Month View",
      icon: CalendarDays
    },
    {
      key: "settings",
      href: "/settings",
      label: "Settings",
      icon: Settings
    }
  ] as const;

  return (
    <nav className="space-y-1">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive =
          (item.key === "projects" && pathname === "/projects") ||
          (item.key === "week" && pathname.includes("/week")) ||
          (item.key === "month" && pathname.includes("/month")) ||
          (item.key === "settings" && pathname === "/settings");

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
