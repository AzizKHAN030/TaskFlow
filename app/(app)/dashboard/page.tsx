import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export default async function DashboardRedirectPage() {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      defaultProjectId: true,
      preferredView: true
    }
  });

  if (!dbUser?.defaultProjectId) {
    redirect("/projects");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: dbUser.defaultProjectId,
      ownerId: user.id
    },
    select: {
      id: true
    }
  });

  if (!project) {
    redirect("/projects");
  }

  const view = dbUser.preferredView === "MONTH" ? "month" : "week";
  redirect(`/projects/${project.id}/${view}`);
}
