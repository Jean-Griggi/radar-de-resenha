import { z } from 'zod';
import { ROLE_CATEGORIES } from '@resenhometro/shared';

export const createRoleSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().nullable(),
  date: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  category: z.enum(ROLE_CATEGORIES).optional(),
  estimatedCost: z.number().min(0).optional().nullable(),
  tags: z.array(z.string().min(1).max(32)).max(12).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const attendanceSchema = z.object({
  status: z.enum(['going', 'maybe', 'not_going']),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
