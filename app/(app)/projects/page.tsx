import { requireUser } from "@/lib/auth-helpers";
import { findProjectsForUser } from "@/lib/data";
import { ProjectsClient } from "@/components/app/projects-client";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, preferences] = await Promise.all([
    findProjectsForUser(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { defaultProjectId: true } })
  ]);

  return <ProjectsClient initialProjects={projects} defaultProjectId={preferences?.defaultProjectId ?? null} />;
}
