import { z } from 'zod';

export const friendRequestSchema = z.object({
  userId: z.string().min(1),
});

export const respondFriendSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

export const updateMeSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(280).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  isPublic: z.boolean().optional(),
  showFollowers: z.boolean().optional(),
  showInteractions: z.boolean().optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
