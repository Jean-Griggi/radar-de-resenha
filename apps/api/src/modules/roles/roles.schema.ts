import { z } from 'zod';
import { ROLE_CATEGORIES } from '@resenhometro/shared';

const roleFields = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().nullable(),
  date: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  // Ponto exato do mapa. Os dois vêm juntos ou os dois somem (a coluna também confere).
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  category: z.enum(ROLE_CATEGORIES).optional(),
  estimatedCost: z.number().min(0).optional().nullable(),
  tags: z.array(z.string().min(1).max(32)).max(12).optional(),
});

const pairedPoint = {
  message: 'Latitude e longitude precisam vir juntas',
  path: ['latitude'],
};

/** Ausentes (não mexe), os dois nulos (limpa) ou os dois números (grava). Um sem o outro é erro. */
function hasValidPair(value: { latitude?: number | null; longitude?: number | null }) {
  const lat = value.latitude;
  const lng = value.longitude;
  if (lat === undefined && lng === undefined) return true;
  if (lat === undefined || lng === undefined) return false;
  return (lat === null) === (lng === null);
}

export const createRoleSchema = roleFields.refine(hasValidPair, pairedPoint);

export const updateRoleSchema = roleFields.partial().refine(hasValidPair, pairedPoint);

export const attendanceSchema = z.object({
  status: z.enum(['going', 'maybe', 'not_going']),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
