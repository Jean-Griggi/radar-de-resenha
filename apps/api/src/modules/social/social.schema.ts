import { z } from 'zod';

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional().nullable(),
});

export const commentTargetSchema = z.enum(['role', 'review', 'post', 'photo', 'audio']);

export const createTargetCommentSchema = commentSchema.extend({
  targetType: commentTargetSchema,
  targetId: z.string().min(1),
});

export const commentQuerySchema = z.object({
  targetType: commentTargetSchema,
  targetId: z.string().min(1),
});

export const reactionSchema = z.object({
  targetType: z.enum(['role', 'review', 'post', 'comment', 'photo', 'audio']),
  targetId: z.string().min(1),
  type: z.enum(['heart', 'laugh', 'cry', 'fire', 'eyes']),
});

export const postSchema = z.object({
  content: z.string().min(1).max(500),
});

export const composerSchema = z.object({
  kind: z.enum(['post', 'role', 'review', 'photo', 'audio', 'music']),
  content: z.string().max(2000).optional(),
});
