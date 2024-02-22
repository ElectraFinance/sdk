import { z } from 'zod';

export const statisticsOverviewSchema = z
  .object({
    time: z.number(),
    statisticsOverview: z.object({
      volume24h: z.number(),
      volume7d: z.number(),
      volumeAllTime: z.number()
    })
  });
