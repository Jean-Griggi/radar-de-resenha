import { z } from 'zod';

export const storyReplySchema = z.object({
  content: z.string().min(1).max(280),
});
