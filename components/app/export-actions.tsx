"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { DateRange, DayPicker } from "react-day-picker";
import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ExportType = "weekly" | "monthly";

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function getFilenameFromContentDisposition(header: string | null) {
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
}

export function ExportActions({
  projectId,
  defaultType,
  active = false,
  variant = "tabs"
}: {
  projectId?: string | null;
  defaultType: ExportType;
  active?: boolean;
  variant?: "tabs" | "sidebar";
}) {
  const [loading, setLoading] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();

  const disabled = !projectId || loading;

  const classes = useMemo(() => {
    if (variant === "sidebar") {
      return {
        wrapper: "group flex w-full items-center",
        main: "w-full justify-start rounded-r-none border-r-0",
        chev: "rounded-l-none"
      };
    }

    return {
      wrapper: "group inline-flex items-center",
      main: "rounded-r-none border-r-0",
      chev: "rounded-l-none"
    };
  }, [variant]);

  const buttonVariant = active ? "default" : "outline";

  const download = async (url: string) => {
    try {
      setLoading(true);
      const res = await fetch(url);

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Export failed");
      }

      const responseFilename = getFilenameFromContentDisposition(
        res.headers.get("Content-Disposition")
      );
      const blob = await res.blob();
      const href = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = responseFilename ?? `taskflow-export-${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(href);
      toast.success("DOCX export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const base = projectId ? `/api/projects/${projectId}/export` : "";

  return (
    <>
      <div className={classes.wrapper}>
        <Button
          type="button"
          variant={buttonVariant}
          className={cn(classes.main, variant === "sidebar" && "px-3 py-2 text-sm")}
          disabled={disabled}
          onClick={() => {
            void download(`${base}?type=${defaultType}`);
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={buttonVariant}
              className={cn(
                classes.chev,
                "px-2"
              )}
              disabled={disabled}
              aria-label="Export options"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                void download(`${base}?type=weekly`);
              }}
            >
              Export Weekly
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void download(`${base}?type=monthly`);
              }}
            >
              Export Month
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setCustomOpen(true);
              }}
            >
              Export Custom
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Export</DialogTitle>
            <DialogDescription>Select a date range and export to DOCX.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-3">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              weekStartsOn={1}
              numberOfMonths={1}
              className="w-full"
              classNames={{
                months: "w-full",
                month: "w-full",
                caption: "flex w-full items-center justify-between",
                table: "w-full border-collapse",
                head_row: "grid grid-cols-7",
                row: "grid grid-cols-7",
                cell: "w-full text-center"
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!range?.from || !range?.to || loading || !projectId}
              onClick={async () => {
                if (!range?.from || !range?.to || !projectId) {
                  return;
                }

                await download(
                  `${base}?type=custom&from=${toDateKey(range.from)}&to=${toDateKey(range.to)}`
                );
                setCustomOpen(false);
              }}
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
