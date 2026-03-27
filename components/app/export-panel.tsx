"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

export function ExportPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-01"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

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

  const base = `/api/projects/${projectId}/export`;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Export</CardTitle>
          <CardDescription>Export current week (Monday to Sunday).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled={loading} onClick={() => download(`${base}?type=weekly`)}>
            <Download className="mr-2 h-4 w-4" />
            Export Week
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Export</CardTitle>
          <CardDescription>Export current calendar month.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled={loading} onClick={() => download(`${base}?type=monthly`)}>
            <Download className="mr-2 h-4 w-4" />
            Export Month
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Range</CardTitle>
          <CardDescription>Export tasks in any selected date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <Button
            className="w-full"
            disabled={loading || !from || !to}
            onClick={() => download(`${base}?type=custom&from=${from}&to=${to}`)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Custom
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
