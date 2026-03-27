import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(120),
  description: z.string().max(3000).optional()
});

export const updateProjectSchema = createProjectSchema.extend({
  id: z.string().cuid()
});

export const deleteProjectSchema = z.object({
  id: z.string().cuid()
});
