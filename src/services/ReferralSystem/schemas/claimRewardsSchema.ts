import { z } from 'zod';

export const claimRewardsSchema = z.object({
  referer: z.string(),
  amount: z.string(),
  pending_amount: z.union([z.string(), z.number()]),
  signature: z.string(),
});
