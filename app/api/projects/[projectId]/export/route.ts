import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { findProjectForUser, findTasksForProjectRange } from "@/lib/data";
import { buildTaskReportDocx } from "@/lib/docs/task-report";
import { prisma } from "@/lib/prisma";
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";

function getRange(searchParams: URLSearchParams) {
  const type = searchParams.get("type") ?? "custom";
  const today = new Date();

  if (type === "weekly") {
    const from = startOfWeek(today, { weekStartsOn: 1 });
    const to = endOfWeek(today, { weekStartsOn: 1 });
    return { from, to };
  }

  if (type === "monthly") {
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    return { from, to };
  }

  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  if (!fromRaw || !toRaw) {
    throw new Error("from and to are required for custom export");
  }

  return { from: parseISO(fromRaw), to: parseISO(toRaw) };
}

function sanitizeFilenamePart(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveTemplateFilename(input: {
  template: string | null | undefined;
  projectName: string;
  from: Date;
  to: Date;
  fullName: string;
}) {
  const template = (input.template ?? "{project}-{from}-{to}").trim();

  const nameParts = input.fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "user";
  const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  const vars: Record<string, string> = {
    "{project}": sanitizeFilenamePart(input.projectName || "project"),
    "{from}": format(input.from, "yyyy-MM-dd"),
    "{to}": format(input.to, "yyyy-MM-dd"),
    "{fromYYYY}": format(input.from, "yyyy"),
    "{fromMM}": format(input.from, "MM"),
    "{fromDD}": format(input.from, "dd"),
    "{toYYYY}": format(input.to, "yyyy"),
    "{toMM}": format(input.to, "MM"),
    "{toDD}": format(input.to, "dd"),
    "{YYYY}": format(input.to, "yyyy"),
    "{MM}": format(input.to, "MM"),
    "{DD}": format(input.to, "dd"),
    "{name}": sanitizeFilenamePart(firstName),
    "{surname}": sanitizeFilenamePart(surname),
    "{fullName}": sanitizeFilenamePart(input.fullName || "user")
  };

  let resolved = template;
  for (const [token, value] of Object.entries(vars)) {
    resolved = resolved.split(token).join(value);
  }

  const sanitized = sanitizeFilenamePart(resolved) || "taskflow-export";
  return `${sanitized}.docx`;
}

function isWeekendUtc(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;

  const project = await findProjectForUser(projectId, session.user.id);

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  try {
    const { from, to } = getRange(req.nextUrl.searchParams);

    const tasks = await findTasksForProjectRange(project.id, from, to);
    const filtered = tasks
      .filter((task) => !!task.title.trim())
      .filter((task) => !isWeekendUtc(task.taskDate));

    if (!filtered.length) {
      return new Response("No non-weekend tasks found in selected range", { status: 400 });
    }

    const effectiveTo = filtered.reduce(
      (max, task) => (task.taskDate > max ? task.taskDate : max),
      filtered[0].taskDate
    );

    const buffer = await buildTaskReportDocx({
      from,
      to: effectiveTo,
      tasks: filtered
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        exportFileNameTemplate: true
      }
    });

    const fullName = user?.name?.trim() || user?.email?.split("@")[0] || "user";
    const filename = resolveTemplateFilename({
      template: user?.exportFileNameTemplate,
      projectName: project.name,
      from,
      to: effectiveTo,
      fullName
    });

    const bytes = new Uint8Array(buffer);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=\"${filename}\"`
      }
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Export failed", {
      status: 400
    });
  }
}
