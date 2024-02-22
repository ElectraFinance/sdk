import { z } from 'zod';

export const leaderboardSchema = z
  .object({
    address: z.string(),
    totalVolume: z.number(),
    todayVolume: z.number(),
    totalPnl: z.number(),
    todayPnl: z.number(),
    totalRoi: z.number(),
    todayRoi: z.number(),
  })
  .array();
