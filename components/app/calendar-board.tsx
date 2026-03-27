"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { duplicateTask, moveTask, upsertTask, deleteTask } from "@/lib/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { TaskFormDialog } from "@/components/app/task-form-dialog";

type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  taskDate: string;
  sortOrder: number;
};

type CalendarDay = {
  key: string;
  label: string;
  subLabel: string;
  isWeekend: boolean;
  isCurrentMonth?: boolean;
  isToday?: boolean;
};

function SortableTaskCard({
  task,
  onEdit,
  onDuplicate,
  onDelete,
  pending
}: {
  task: CalendarTask;
  onEdit: (task: CalendarTask) => void;
  onDuplicate: (task: CalendarTask) => void;
  onDelete: (task: CalendarTask) => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      dayKey: task.taskDate
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border bg-card p-3 shadow-sm",
        isDragging && "opacity-70"
      )}
    >
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-card p-1 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="pointer-events-auto h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(task);
          }}
          disabled={pending}
          aria-label="Duplicate task"
        >
          <Copy className="h-4 w-4" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="pointer-events-auto h-6 w-6 text-destructive"
              aria-label="Delete task"
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(task)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <button
          type="button"
          className="pointer-events-auto rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Drag task"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <button className="w-full text-left" onClick={() => onEdit(task)} type="button">
        <p className="line-clamp-2 text-sm font-semibold">{task.title}</p>
        {task.description ? (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{task.description}</p>
        ) : null}
      </button>
    </Card>
  );
}

function DayColumn({
  day,
  tasks,
  onAdd,
  onEdit,
  onDuplicate,
  onDelete,
  pending
}: {
  day: CalendarDay;
  tasks: CalendarTask[];
  onAdd: (dayKey: string) => void;
  onEdit: (task: CalendarTask) => void;
  onDuplicate: (task: CalendarTask) => void;
  onDelete: (task: CalendarTask) => void;
  pending: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.key}`,
    data: { type: "day", dayKey: day.key }
  });

  return (
    <div
      ref={setNodeRef}
      data-day-key={day.key}
      className={cn(
        "flex min-h-[460px] flex-col rounded-lg border bg-muted/40 p-2",
        day.isWeekend && "bg-weekend",
        day.isToday && "border-primary ring-2 ring-primary/40",
        isOver && "ring-2 ring-primary/50",
        day.isCurrentMonth === false && "opacity-60"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{day.label}</p>
          <p className={cn("text-sm font-semibold", day.isToday && "text-primary")}>
            {day.subLabel} {day.isToday ? "• Today" : ""}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onAdd(day.key)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      <div className="space-y-2">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              pending={pending}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function CalendarBoard({
  projectId,
  initialTasks,
  days,
  mode
}: {
  projectId: string;
  initialTasks: CalendarTask[];
  days: CalendarDay[];
  mode: "week" | "month";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tasks, setTasks] = useState<CalendarTask[]>(initialTasks);
  const [dialog, setDialog] = useState<{
    open: boolean;
    initial: { id?: string; title?: string; description?: string | null; taskDate: string };
  }>({
    open: false,
    initial: { taskDate: days[0]?.key ?? "" }
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();

    for (const day of days) {
      map.set(day.key, []);
    }

    for (const task of tasks) {
      if (!map.has(task.taskDate)) {
        map.set(task.taskDate, []);
      }
      map.get(task.taskDate)!.push(task);
    }

    for (const [key, bucket] of map) {
      map.set(
        key,
        bucket.sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title))
      );
    }

    return map;
  }, [days, tasks]);

  const refresh = () => router.refresh();
  const todayDay = days.find((day) => day.isToday);

  useEffect(() => {
    if (mode !== "month" || !todayDay) {
      return;
    }

    const el = document.querySelector<HTMLElement>(`[data-day-key="${todayDay.key}"]`);

    if (!el) {
      return;
    }

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [days, mode, todayDay]);
  const activeTask = tasks.find((task) => task.id === dialog.initial.id);

  const handleDuplicate = (task: CalendarTask) => {
    startTransition(async () => {
      try {
        await duplicateTask({
          id: task.id,
          projectId,
          taskDate: task.taskDate
        });
        toast.success("Task duplicated");
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to duplicate task");
      }
    });
  };

  const handleDelete = (task: CalendarTask) => {
    startTransition(async () => {
      try {
        await deleteTask({ id: task.id, projectId });
        setTasks((current) => current.filter((currentTask) => currentTask.id !== task.id));
        setDialog((state) => ({ ...state, open: false }));
        toast.success("Task deleted");
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete task");
      }
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const activeTask = tasks.find((task) => task.id === activeId);

    if (!activeTask) {
      return;
    }

    const overDayKey =
      (over.data.current?.dayKey as string | undefined) ??
      (typeof over.id === "string" && over.id.startsWith("day-") ? over.id.replace("day-", "") : undefined);

    if (!overDayKey || overDayKey === activeTask.taskDate) {
      return;
    }

    const prevTasks = tasks;

    setTasks((current) =>
      current.map((task) => (task.id === activeId ? { ...task, taskDate: overDayKey } : task))
    );

    startTransition(async () => {
      try {
        await moveTask({
          id: activeId,
          projectId,
          taskDate: overDayKey
        });
      } catch (error) {
        setTasks(prevTasks);
        toast.error(error instanceof Error ? error.message : "Failed to move task");
      }
    });
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div
          className={cn(
            "grid gap-2",
            mode === "week" ? "grid-cols-1 lg:grid-cols-7" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
          )}
        >
          {days.map((day) => (
            <DayColumn
              key={day.key}
              day={day}
              tasks={grouped.get(day.key) ?? []}
              pending={pending}
              onAdd={(dayKey) =>
                setDialog({
                  open: true,
                  initial: {
                    taskDate: dayKey
                  }
                })
              }
              onEdit={(task) =>
                setDialog({
                  open: true,
                  initial: {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    taskDate: task.taskDate
                  }
                })
              }
              onDuplicate={(task) => {
                handleDuplicate(task);
              }}
              onDelete={(task) => {
                handleDelete(task);
              }}
            />
          ))}
        </div>
      </DndContext>

      <TaskFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((state) => ({ ...state, open }))}
        initial={dialog.initial}
        pending={pending}
        onDuplicate={
          activeTask
            ? () => {
                handleDuplicate(activeTask);
              }
            : undefined
        }
        onDelete={
          activeTask
            ? () => {
                handleDelete(activeTask);
              }
            : undefined
        }
        onSubmit={(values) => {
          startTransition(async () => {
            try {
              const saved = await upsertTask({
                id: values.id,
                projectId,
                title: values.title,
                description: values.description,
                taskDate: values.taskDate
              });

              setDialog((state) => ({ ...state, open: false }));
              setTasks((current) => {
                const exists = current.some((item) => item.id === saved.id);
                const next = {
                  id: saved.id,
                  title: saved.title,
                  description: saved.description,
                  taskDate: saved.taskDate.toISOString().slice(0, 10),
                  sortOrder: saved.sortOrder
                };

                if (exists) {
                  return current.map((item) => (item.id === saved.id ? next : item));
                }

                return [...current, next];
              });

              toast.success(values.id ? "Task updated" : "Task added");
              refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to save task");
            }
          });
        }}
      />
    </>
  );
}
