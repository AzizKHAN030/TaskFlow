import { z } from "zod";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const upsertTaskSchema = z.object({
  id: z.string().cuid().optional(),
  projectId: z.string().cuid(),
  title: z.string().min(1, "Task name is required").max(240),
  description: z.string().max(10000).optional(),
  taskDate: dateKeySchema
});

export const deleteTaskSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid()
});

export const duplicateTaskSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  taskDate: dateKeySchema.optional()
});

export const moveTaskSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  taskDate: dateKeySchema,
  sortOrder: z.number().int().nonnegative().optional()
});
