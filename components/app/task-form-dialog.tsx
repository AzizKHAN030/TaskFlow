"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type InitialTask = {
  id?: string;
  title?: string;
  description?: string | null;
  taskDate: string;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSubmit,
  onDuplicate,
  onDelete
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: InitialTask;
  pending: boolean;
  onSubmit: (values: { id?: string; title: string; description?: string; taskDate: string }) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");

  useEffect(() => {
    if (open) {
      setTitle(initial.title ?? "");
      setDescription(initial.description ?? "");
    }
  }, [initial.description, initial.title, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial.id ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>Log completed work for this day.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              id: initial.id,
              title,
              description,
              taskDate: initial.taskDate
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Name</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="#1316 Review migration modules"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Task Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what was completed"
            />
          </div>

          <DialogFooter>
            {initial.id ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={onDuplicate}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : null}
            <Button type="submit" disabled={pending}>{initial.id ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
