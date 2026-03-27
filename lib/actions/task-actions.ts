"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
  deleteTaskSchema,
  duplicateTaskSchema,
  moveTaskSchema,
  upsertTaskSchema
} from "@/lib/validators/task";
import { endOfDay, startOfDay } from "date-fns";

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId
    }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
}

function revalidateProjectPages(projectId: string) {
  revalidatePath(`/projects/${projectId}/week`);
  revalidatePath(`/projects/${projectId}/month`);
  revalidatePath(`/projects/${projectId}/export`);
}

export async function listTasksForRange(input: {
  projectId: string;
  from: string;
  to: string;
}) {
  const user = await requireUser();
  await assertProjectOwnership(input.projectId, user.id);

  return prisma.task.findMany({
    where: {
      projectId: input.projectId,
      taskDate: {
        gte: startOfDay(new Date(input.from)),
        lte: endOfDay(new Date(input.to))
      }
    },
    orderBy: [{ taskDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });
}

export async function upsertTask(input: {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  taskDate: string;
}) {
  const user = await requireUser();
  const parsed = upsertTaskSchema.parse(input);
  await assertProjectOwnership(parsed.projectId, user.id);

  if (parsed.id) {
    const existing = await prisma.task.findFirst({
      where: {
        id: parsed.id,
        projectId: parsed.projectId
      }
    });

    if (!existing) {
      throw new Error("Task not found");
    }

    const updated = await prisma.task.update({
      where: { id: parsed.id },
      data: {
        title: parsed.title,
        description: parsed.description,
        taskDate: new Date(parsed.taskDate)
      }
    });

    revalidateProjectPages(parsed.projectId);
    return updated;
  }

  const maxSort = await prisma.task.aggregate({
    where: {
      projectId: parsed.projectId,
      taskDate: new Date(parsed.taskDate)
    },
    _max: { sortOrder: true }
  });

  const created = await prisma.task.create({
    data: {
      projectId: parsed.projectId,
      title: parsed.title,
      description: parsed.description,
      taskDate: new Date(parsed.taskDate),
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1
    }
  });

  revalidateProjectPages(parsed.projectId);
  return created;
}

export async function deleteTask(input: { id: string; projectId: string }) {
  const user = await requireUser();
  const parsed = deleteTaskSchema.parse(input);
  await assertProjectOwnership(parsed.projectId, user.id);

  await prisma.task.delete({
    where: { id: parsed.id }
  });

  revalidateProjectPages(parsed.projectId);
  return { success: true };
}

export async function duplicateTask(input: {
  id: string;
  projectId: string;
  taskDate?: string;
}) {
  const user = await requireUser();
  const parsed = duplicateTaskSchema.parse(input);
  await assertProjectOwnership(parsed.projectId, user.id);

  const existing = await prisma.task.findFirst({
    where: { id: parsed.id, projectId: parsed.projectId }
  });

  if (!existing) {
    throw new Error("Task not found");
  }

  const targetDate = parsed.taskDate ? new Date(parsed.taskDate) : existing.taskDate;

  const maxSort = await prisma.task.aggregate({
    where: {
      projectId: parsed.projectId,
      taskDate: targetDate
    },
    _max: { sortOrder: true }
  });

  const clone = await prisma.task.create({
    data: {
      projectId: parsed.projectId,
      title: existing.title,
      description: existing.description,
      taskDate: targetDate,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1
    }
  });

  revalidateProjectPages(parsed.projectId);
  return clone;
}

export async function moveTask(input: {
  id: string;
  projectId: string;
  taskDate: string;
  sortOrder?: number;
}) {
  const user = await requireUser();
  const parsed = moveTaskSchema.parse(input);
  await assertProjectOwnership(parsed.projectId, user.id);

  const updated = await prisma.task.update({
    where: { id: parsed.id },
    data: {
      taskDate: new Date(parsed.taskDate),
      sortOrder: parsed.sortOrder ?? 0
    }
  });

  revalidateProjectPages(parsed.projectId);
  return updated;
}
