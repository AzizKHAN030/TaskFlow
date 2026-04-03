"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function getReminderState(now: Date) {
  const dayOfWeek = now.getDay();
  const isFriday = dayOfWeek === 5;
  const lastDateOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isLastDayOfMonth = now.getDate() === lastDateOfMonth;

  return { isFriday, isLastDayOfMonth };
}

function getDismissKey(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `taskflow-export-reminder-${year}-${month}-${day}`;
}

export function ExportReminderBanner() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState(false);
  const [exportingType, setExportingType] = useState<"weekly" | "monthly" | null>(null);

  const { isFriday, isLastDayOfMonth } = useMemo(() => getReminderState(now), [now]);
  const shouldShow = isFriday || isLastDayOfMonth;

  useEffect(() => {
    setMounted(true);
    setNow(new Date());

    const tick = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (!shouldShow) {
      setDismissed(false);
      return;
    }

    const key = getDismissKey(now);
    const isDismissed = window.sessionStorage.getItem(key) === "1";
    setDismissed(isDismissed);
  }, [mounted, now, shouldShow]);

  if (!mounted || !shouldShow || dismissed) {
    return null;
  }

  const projectIdMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectIdMatch?.[1] ?? null;

  const parseFilename = (header: string | null) => {
    if (!header) {
      return null;
    }

    const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]).replace(/["']/g, "");
    }

    const plainMatch = header.match(/filename="?([^"]+)"?/i);
    if (plainMatch?.[1]) {
      return plainMatch[1];
    }

    return null;
  };

  const downloadExport = async (type: "weekly" | "monthly") => {
    if (!projectId || exportingType) {
      return;
    }

    try {
      setExportingType(type);
      const response = await fetch(`/api/projects/${projectId}/export?type=${type}`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Export failed");
      }

      const filename = parseFilename(response.headers.get("Content-Disposition"));
      const blob = await response.blob();
      const href = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename ?? `taskflow-export-${Date.now()}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(href);
      toast.success(`${type === "monthly" ? "Monthly" : "Weekly"} export downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExportingType(null);
    }
  };

  const message =
    isFriday && isLastDayOfMonth
      ? "Reminder: export tasks for the last week and last month, then send the report to HR and your team lead."
      : isLastDayOfMonth
        ? "Reminder: export tasks for the last month and send the report to HR and your team lead."
        : "Reminder: export tasks for the last week and send the report to HR and your team lead.";

  return (
    <div className="mb-4 rounded-lg border border-amber-300/70 bg-amber-100/90 p-3 text-amber-950 shadow-sm dark:border-amber-700/70 dark:bg-amber-900/30 dark:text-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-2 text-center">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="flex items-center gap-2">
        {projectId ? (
          <div className="flex shrink-0 items-center gap-2">
            {isFriday && isLastDayOfMonth ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-500/60 bg-amber-50 px-2 text-xs text-amber-950 hover:bg-amber-200/70 dark:border-amber-600 dark:bg-amber-900/25 dark:text-amber-100 dark:hover:bg-amber-800/40"
                  disabled={!!exportingType}
                  onClick={() => {
                    void downloadExport("weekly");
                  }}
                >
                  {exportingType === "weekly" ? "Exporting..." : "Export Week"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-500/60 bg-amber-50 px-2 text-xs text-amber-950 hover:bg-amber-200/70 dark:border-amber-600 dark:bg-amber-900/25 dark:text-amber-100 dark:hover:bg-amber-800/40"
                  disabled={!!exportingType}
                  onClick={() => {
                    void downloadExport("monthly");
                  }}
                >
                  {exportingType === "monthly" ? "Exporting..." : "Export Month"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-amber-500/60 bg-amber-50 px-2 text-xs text-amber-950 hover:bg-amber-200/70 dark:border-amber-600 dark:bg-amber-900/25 dark:text-amber-100 dark:hover:bg-amber-800/40"
                disabled={!!exportingType}
                onClick={() => {
                  void downloadExport(isLastDayOfMonth ? "monthly" : "weekly");
                }}
              >
                {exportingType
                  ? "Exporting..."
                  : isLastDayOfMonth
                    ? "Export Month"
                    : "Export Week"}
              </Button>
            )}
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-current hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
          onClick={() => {
            window.sessionStorage.setItem(getDismissKey(now), "1");
            setDismissed(true);
          }}
          aria-label="Dismiss export reminder"
        >
          <X className="h-4 w-4" />
        </Button>
        </div>
      </div>
    </div>
  );
}
