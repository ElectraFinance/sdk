import { z } from 'zod';

const crossMarginCFDItemInfo = z.object({
  id: z.number(),
  name: z.string(),
  leverage: z.number(),
  longFR: z.number(),
  shortFR: z.number(),
  longFRStored: z.number(),
  shortFRStored: z.number(),
  lastFRPriceUpdateTime: z.number(),
});

const crossMarginInfoSchema = z.object({
  address: z.string().optional(),
  fundingRateAccount: z.string().optional(),
  soLevel: z.number().optional(),
  delegateContractAddress: z.string().optional(),
  instruments: z.record(z.string(), crossMarginCFDItemInfo),
  withdrawMarginLevel: z.number().optional(),
});

export default crossMarginInfoSchema;
