"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
  createProjectSchema,
  deleteProjectSchema,
  updateProjectSchema
} from "@/lib/validators/project";

export async function listProjects() {
  const user = await requireUser();

  return prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getProjectById(projectId: string) {
  const user = await requireUser();

  return prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id
    }
  });
}

export async function createProject(input: { name: string; description?: string }) {
  const user = await requireUser();
  const parsed = createProjectSchema.parse(input);

  const created = await prisma.project.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      ownerId: user.id
    }
  });

  revalidatePath("/projects");
  return created;
}

export async function updateProject(input: { id: string; name: string; description?: string }) {
  const user = await requireUser();
  const parsed = updateProjectSchema.parse(input);

  const existing = await prisma.project.findFirst({
    where: { id: parsed.id, ownerId: user.id }
  });

  if (!existing) {
    throw new Error("Project not found");
  }

  const updated = await prisma.project.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      description: parsed.description
    }
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${parsed.id}/week`);
  revalidatePath(`/projects/${parsed.id}/month`);
  revalidatePath(`/projects/${parsed.id}/export`);

  return updated;
}

export async function deleteProject(input: { id: string }) {
  const user = await requireUser();
  const parsed = deleteProjectSchema.parse(input);

  const existing = await prisma.project.findFirst({
    where: { id: parsed.id, ownerId: user.id }
  });

  if (!existing) {
    throw new Error("Project not found");
  }

  await prisma.project.delete({ where: { id: parsed.id } });

  revalidatePath("/projects");
  return { success: true };
}
