import { z } from 'zod';

export const topPairsSchema = z.object({
  time: z.number(),
  topPairs: z.array(
    z.object({
      assetPair: z.string(),
      periodVolume: z.object({ volume24h: z.number(), volume7d: z.number() }),
    })
  ),
});
