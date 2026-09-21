import { z } from 'zod';

export const musicSchema = z.object({
  title: z.string().min(1).max(160),
  artist: z.string().min(1).max(160),
  album: z.string().max(160).optional().nullable(),
  cover: z.string().url().optional().nullable(),
  spotifyUrl: z.string().url().optional().nullable(),
  spotifyId: z.string().optional().nullable(),
});
