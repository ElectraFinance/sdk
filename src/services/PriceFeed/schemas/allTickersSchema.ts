import { z } from 'zod';

export const allTickersSchema = z
  .object({
    pair: z.string(),
    volume24: z.number(),
    change24: z.number(),
    lastPrice: z.number(),
  })
  .array();
