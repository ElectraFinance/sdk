import { z } from 'zod';

export const winnersSchema = z.object({
  bestTrade: z.object({
    address: z.string(),
    instrument: z.string(),
    leverage: z.number(),
    pnl: z.number(),
    side: z.string()
  }),
  worstTrade: z.object({
    address: z.string(),
    instrument: z.string(),
    leverage: z.number(),
    pnl: z.number(),
    side: z.string()
  }),
  bestPnl: z.object({ address: z.string(), pnl: z.number() }),
  worstPnl: z.object({ address: z.string(), pnl: z.number() })
});
