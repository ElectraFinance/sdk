import { z } from 'zod';

export const isWhitelistedSchema = z.object({
  status: z.string(),
  whitelisted: z.number(),
});
