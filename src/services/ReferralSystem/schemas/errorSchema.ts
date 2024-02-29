import { z } from 'zod';

export const errorSchema = z.object({
  status: z.string(),
  message: z.string(),
});
