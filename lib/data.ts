import { endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function findProjectForUser(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId
    }
  });
}

export async function findProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: {
      ownerId: userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function findTasksForProjectRange(projectId: string, from: Date, to: Date) {
  return prisma.task.findMany({
    where: {
      projectId,
      taskDate: {
        gte: startOfDay(from),
        lte: endOfDay(to)
      }
    },
    orderBy: [{ taskDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });
}
