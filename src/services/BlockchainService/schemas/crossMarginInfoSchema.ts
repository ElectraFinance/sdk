import { z } from 'zod';

const crossMarginCFDItemInfo = z.object({
  index: z.number(),
  alias: z.string(),
  name: z.string(),
  leverage: z.string(),
  longFR: z.string(),
  shortFR: z.string(),
  longFRStored: z.string(),
  shortFRStored: z.string(),
  lastFRPriceUpdateTime: z.number(),
  feePercent: z.number(),
  withdrawMarginLevel: z.number(),
});

const crossMarginInfoSchema = z.object({
  address: z.string().optional(),
  fundingRateAccount: z.string().optional(),
  soLevel: z.number().optional(),
  delegateContractAddress: z.string().optional(),
  instruments: z.record(z.string(), crossMarginCFDItemInfo.partial()),
  withdrawMarginLevel: z.number().optional(),
});

export default crossMarginInfoSchema;
