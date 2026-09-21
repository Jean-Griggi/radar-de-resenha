import { z } from 'zod';

export const friendRequestSchema = z.object({
  userId: z.string().min(1),
});

export const respondFriendSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});
