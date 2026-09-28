import { z } from 'zod';

export const friendRequestSchema = z.object({
  userId: z.string().min(1),
});

export const respondFriendSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

const latitudeSchema = z
  .number()
  .gte(-90, { message: 'Latitude fora do intervalo' })
  .lte(90, { message: 'Latitude fora do intervalo' })
  .nullable();

const longitudeSchema = z
  .number()
  .gte(-180, { message: 'Longitude fora do intervalo' })
  .lte(180, { message: 'Longitude fora do intervalo' })
  .nullable();

const placeNameSchema = z
  .string()
  .trim()
  .max(40, { message: 'Nome do lugar longo demais' })
  .nullable()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return value;
    return value.length === 0 ? null : value;
  });

export const updateMeSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(280).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    isPublic: z.boolean().optional(),
    showFollowers: z.boolean().optional(),
    showInteractions: z.boolean().optional(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    placeName: placeNameSchema,
  })
  .superRefine((data, ctx) => {
    const hasLat = data.latitude !== undefined;
    const hasLng = data.longitude !== undefined;
    const bothNull = data.latitude === null && data.longitude === null;
    const bothNumbers = typeof data.latitude === 'number' && typeof data.longitude === 'number';
    if (hasLat || hasLng) {
      if (!(hasLat && hasLng && (bothNull || bothNumbers))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe latitude e longitude juntas',
          path: ['latitude'],
        });
      }
    }
    if (data.placeName === undefined) return;
    const nameWithPoint = typeof data.placeName === 'string' ? bothNumbers : bothNull || bothNumbers;
    if (nameWithPoint) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O nome do lugar só vai com o ponto',
      path: ['placeName'],
    });
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
