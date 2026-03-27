import { requireUser } from "@/lib/auth-helpers";
import { findProjectsForUser } from "@/lib/data";
import { ProjectsClient } from "@/components/app/projects-client";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await findProjectsForUser(user.id);

  return <ProjectsClient initialProjects={projects} />;
}
