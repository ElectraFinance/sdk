import { z } from 'zod';

const pointsAdditionalSchema = z.object({
  event_name: z.string(),
  points: z.number(),
});

export const accountDetailsSchema = z.object({
  address: z.string(),
  ref_link: z.string(),
  referrals_count: z.number(),
  direct_referrals_count: z.number(),
  points_total: z.number(),
  points_trading_volume: z.number(),
  points_network_trading_volume: z.number(),
  network_trading_volume: z.number(),
  points_additional: z.array(pointsAdditionalSchema),
});
