import { z } from 'zod';

export const claimRewardsSchema = z.object({
  referer: z.string(),
  amount: z.string(),
  signature: z.string(),
});
