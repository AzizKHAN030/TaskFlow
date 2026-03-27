"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExportPanel } from "@/components/app/export-panel";

export function ExportDialog({
  projectId,
  children
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Tasks</DialogTitle>
          <DialogDescription>
            Export completed tasks to DOCX by weekly, monthly, or custom period.
          </DialogDescription>
        </DialogHeader>
        <ExportPanel projectId={projectId} />
      </DialogContent>
    </Dialog>
  );
}
