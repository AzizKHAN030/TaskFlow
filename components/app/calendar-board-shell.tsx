"use client";

import { useEffect, useState } from "react";
import { CalendarBoard } from "@/components/app/calendar-board";

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
};

export function CalendarBoardShell({
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-[460px] rounded-lg border bg-slate-50/60" />;
  }

  return (
    <CalendarBoard
      projectId={projectId}
      initialTasks={initialTasks}
      days={days}
      mode={mode}
    />
  );
}
