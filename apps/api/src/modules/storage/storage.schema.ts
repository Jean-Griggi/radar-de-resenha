import { z } from 'zod';

export const signUploadSchema = z.object({
  kind: z.enum(['avatar', 'cover', 'photo', 'audio', 'story']),
  contentType: z.string().min(1).max(120),
  filename: z.string().max(180).optional(),
});
