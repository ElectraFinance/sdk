import { z } from 'zod';
import { paginationInfoSchema } from './paginationInfoSchema';

const dataSchema = z.object({
  referral: z.string(),
  referrals_count: z.number(),
  points_total: z.number(),
  points_referrals: z.number(),
  points_additional: z.number(),
});

export const leaderboardSchema = z.object({
  pagination_info: paginationInfoSchema,
  data: z.array(dataSchema),
});
