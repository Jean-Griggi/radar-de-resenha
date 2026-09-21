import { z } from 'zod';

export const reviewSchema = z.object({
  roleId: z.string().min(1),
  title: z.string().min(3).max(120),
  content: z.string().min(3).max(8000),
  rating: z.number().int().min(1).max(5),
  ratings: z
    .object({
      fun: z.number().int().min(1).max(5).optional(),
      music: z.number().int().min(1).max(5).optional(),
      food: z.number().int().min(1).max(5).optional(),
      ambiance: z.number().int().min(1).max(5).optional(),
      company: z.number().int().min(1).max(5).optional(),
      value: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
  tags: z.array(z.string().min(1).max(32)).max(12).optional(),
});

export const updateReviewSchema = reviewSchema.omit({ roleId: true }).partial();

export type ReviewInput = z.infer<typeof reviewSchema>;
