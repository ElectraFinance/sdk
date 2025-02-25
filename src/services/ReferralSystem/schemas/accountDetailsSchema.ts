import { z } from 'zod';

const pointsAdditionalSchema = z.object({
  event_name: z.string(),
  points: z.number(),
});

export const accountDetailsSchema = z.object({
  address: z.string(),
  ref_link: z.string(),
  rank: z.number().optional(),
  referrals_count: z.number(),
  direct_referrals_count: z.number(),
  points_total: z.number(),
  points_trading_volume: z.number(),
  points_network_trading_volume: z.number(),
  network_trading_volume: z.number(),
  points_additional: z.array(pointsAdditionalSchema),
  tma_claimed_direct_referrals_count: z.number().optional(),
  tma_overall_direct_referrals_count: z.number().optional(),
});

export type AccountDetails = z.infer<typeof accountDetailsSchema>;
