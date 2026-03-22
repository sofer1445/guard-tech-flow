import { z } from 'zod';

export const deviceCategorySchema = z.object({
  name: z.string().trim().min(1),
});

export type DeviceCategoryPayload = z.infer<typeof deviceCategorySchema>;