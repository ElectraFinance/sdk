import { z } from 'zod';
import { makePartial } from '../../../utils/index.js';

const internalFeeAssetSchema = z.object({
  type: z.enum(['percent', 'plain']),
  value: z.number(),
  asset: z.string(),
});
const l2Schema = z.object({
  enabled: z.boolean(),
  l1ChainId: z.number().nullable(),
});

const infoSchema = z.object({
  chainId: z.number(),
  chainName: z.string(),
  swapExecutorContractAddress: z.string().optional(),
  exchangeContractAddress: z.string(),
  oracleContractAddress: z.string(),
  cfdOracleContractAddress: z.string().optional(),
  matcherAddress: z.string(),
  orderFeePercent: z.number(),
  assetToAddress: z.record(z.string()).transform(makePartial),
  assetToDecimals: z.record(z.number()).transform(makePartial),
  assetToIcons: z.record(z.string()).transform(makePartial).optional(),
  cexTokens: z.string().array(),
  internalFeeAssets: internalFeeAssetSchema.array().optional(),
  l2: l2Schema.optional(),
});

export default infoSchema;
