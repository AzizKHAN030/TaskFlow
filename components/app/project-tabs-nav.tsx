"use client";

import Link from "next/link";
import { CalendarDays, CalendarRange } from "lucide-react";
import { ExportActions } from "@/components/app/export-actions";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "week", label: "Week View", icon: CalendarRange },
  { key: "month", label: "Month View", icon: CalendarDays }
] as const;

export function ProjectTabsNav({
  projectId,
  projectName,
  active
}: {
  projectId: string;
  projectName: string;
  active: "week" | "month" | "export";
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Project</p>
          <h1 className="text-lg font-semibold">{projectName}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const href = `/projects/${projectId}/${tab.key}`;
            return (
              <Link
                key={tab.key}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
          <ExportActions
            projectId={projectId}
            defaultType={active === "month" ? "monthly" : "weekly"}
            active={active === "export"}
            variant="tabs"
          />
        </div>
      </div>
    </div>
  );
}
