import { z } from 'zod';

export const createRoleSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  location: z.string().optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
