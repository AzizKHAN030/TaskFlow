import { addMonths, format, getDay, isSameDay, isSameMonth, isValid, parse } from "date-fns";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { findProjectForUser, findTasksForProjectRange } from "@/lib/data";
import { eachDayInclusive, getMonthCalendarRange, toDateKey } from "@/lib/date";
import { CalendarBoardShell } from "@/components/app/calendar-board-shell";
import { ProjectTabsNav } from "@/components/app/project-tabs-nav";
import { CalendarToolbar } from "@/components/app/calendar-toolbar";

export default async function ProjectMonthPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;
  const query = await searchParams;

  const sourceDate = query.month
    ? parse(`${query.month}-01`, "yyyy-MM-dd", new Date())
    : new Date();
  const baseDate = isValid(sourceDate) ? sourceDate : new Date();

  const project = await findProjectForUser(projectId, user.id);

  if (!project) {
    notFound();
  }

  const range = getMonthCalendarRange(baseDate);
  const dates = eachDayInclusive(range.start, range.end);

  const tasks = await findTasksForProjectRange(project.id, range.start, range.end);
  const now = new Date();

  const days = dates.map((date) => ({
    key: toDateKey(date),
    label: format(date, "EEEE"),
    subLabel: format(date, "dd MMM"),
    isWeekend: [0, 6].includes(getDay(date)),
    isCurrentMonth: isSameMonth(date, baseDate),
    isToday: isSameDay(date, now)
  }));

  return (
    <section className="space-y-4">
      <div className="sticky top-14 z-20 space-y-3 bg-background/95 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ProjectTabsNav projectId={project.id} projectName={project.name} active="month" />
        <CalendarToolbar
          title={format(baseDate, "MMMM yyyy")}
          prevHref={`/projects/${project.id}/month?month=${format(addMonths(baseDate, -1), "yyyy-MM")}`}
          nextHref={`/projects/${project.id}/month?month=${format(addMonths(baseDate, 1), "yyyy-MM")}`}
          centerHref={`/projects/${project.id}/month`}
          centerLabel="Current Month"
        />
      </div>
      <CalendarBoardShell
        projectId={project.id}
        mode="month"
        days={days}
        initialTasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          taskDate: toDateKey(task.taskDate),
          sortOrder: task.sortOrder
        }))}
      />
    </section>
  );
}
