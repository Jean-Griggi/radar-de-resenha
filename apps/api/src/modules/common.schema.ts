import { z } from 'zod';
import { ROLE_CATEGORIES } from '@resenhometro/shared';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(6).max(72),
});

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

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional().nullable(),
});

export const reactionSchema = z.object({
  targetType: z.enum(['role', 'review', 'post', 'comment', 'photo', 'audio']),
  targetId: z.string().min(1),
  type: z.enum(['heart', 'laugh', 'cry', 'fire', 'eyes']),
});

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

export const friendRequestSchema = z.object({
  userId: z.string().min(1),
});

export const signUploadSchema = z.object({
  kind: z.enum(['avatar', 'cover', 'photo', 'audio']),
  contentType: z.string().min(1).max(120),
  filename: z.string().max(180).optional(),
});

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

export const musicSchema = z.object({
  title: z.string().min(1).max(160),
  artist: z.string().min(1).max(160),
  album: z.string().max(160).optional().nullable(),
  cover: z.string().url().optional().nullable(),
  spotifyUrl: z.string().url().optional().nullable(),
  spotifyId: z.string().optional().nullable(),
});

export const postSchema = z.object({
  content: z.string().min(1).max(500),
});

export const composerSchema = z.object({
  kind: z.enum(['post', 'role', 'review', 'photo', 'audio', 'music']),
  content: z.string().max(2000).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
