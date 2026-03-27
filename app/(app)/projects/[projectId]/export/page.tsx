import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { findProjectForUser } from "@/lib/data";
import { ProjectTabsNav } from "@/components/app/project-tabs-nav";
import { ExportPanel } from "@/components/app/export-panel";

export default async function ProjectExportPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  const { projectId } = await params;

  const project = await findProjectForUser(projectId, user.id);

  if (!project) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-14 z-20 bg-background/95 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ProjectTabsNav projectId={project.id} projectName={project.name} active="export" />
      </div>
      <ExportPanel projectId={project.id} />
    </section>
  );
}
