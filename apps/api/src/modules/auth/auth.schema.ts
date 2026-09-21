import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  // Login still accepts older 6-char hashes; new register/reset/change require 8.
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
  newPassword: z.string().min(8).max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(8).max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
