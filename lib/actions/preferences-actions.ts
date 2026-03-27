"use server";

import { revalidatePath } from "next/cache";
import { ThemePreference, ViewPreference } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const updatePreferencesSchema = z.object({
  themePreference: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  preferredView: z.enum(["WEEK", "MONTH"]),
  defaultProjectId: z.string().cuid().nullable(),
  exportFileNameTemplate: z.string().min(1).max(200).nullable()
});

export async function updateUserPreferences(input: {
  themePreference: ThemePreference;
  preferredView: ViewPreference;
  defaultProjectId: string | null;
  exportFileNameTemplate: string | null;
}) {
  const user = await requireUser();
  const parsed = updatePreferencesSchema.parse(input);

  if (parsed.defaultProjectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: parsed.defaultProjectId,
        ownerId: user.id
      }
    });

    if (!project) {
      throw new Error("Invalid default project selection");
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      themePreference: parsed.themePreference,
      preferredView: parsed.preferredView,
      defaultProjectId: parsed.defaultProjectId,
      exportFileNameTemplate: parsed.exportFileNameTemplate
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/projects");

  return { success: true };
}
