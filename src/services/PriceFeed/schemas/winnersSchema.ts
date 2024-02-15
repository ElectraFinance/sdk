import { z } from 'zod';

export const winnersSchema = z.object({
  bestTrade: z.object({
    address: z.string(),
    asset: z.string(),
    leverage: z.number(),
    pnl: z.number()
  }),
  worstTrade: z.object({
    address: z.string(),
    asset: z.string(),
    leverage: z.number(),
    pnl: z.number()
  }),
  bestPnl: z.object({ address: z.string(), pnl: z.number() }),
  worstPnl: z.object({ address: z.string(), pnl: z.number() })
});
