import { z } from 'zod';

export const albumSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(400).optional().nullable(),
  roleId: z.string().optional().nullable(),
});

export const photoMetaSchema = z.object({
  caption: z.string().max(200).optional().nullable(),
  albumId: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
});

export const audioMetaSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  duration: z.coerce.number().int().min(0).max(300).optional(),
  roleId: z.string().optional().nullable(),
  reviewId: z.string().optional().nullable(),
});
