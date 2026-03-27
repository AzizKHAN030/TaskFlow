import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/app/settings-form";

export default async function SettingsPage() {
  const user = await requireUser();

  const [projects, dbUser] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        themePreference: true,
        preferredView: true,
        defaultProjectId: true,
        exportFileNameTemplate: true
      }
    })
  ]);

  if (!dbUser) {
    throw new Error("User not found");
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Update your personal TaskFlow preferences.</p>
      </div>

      <SettingsForm
        projects={projects}
        current={{
          themePreference: dbUser.themePreference,
          preferredView: dbUser.preferredView,
          defaultProjectId: dbUser.defaultProjectId,
          exportFileNameTemplate: dbUser.exportFileNameTemplate
        }}
      />
    </div>
  );
}
