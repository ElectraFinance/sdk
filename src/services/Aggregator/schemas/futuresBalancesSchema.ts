import { z } from 'zod';

const futuresBalancesSchema = z.object({
  address: z.string(),
  balance: z.number(),
  statesByInstruments: z.record(z.object({
    instrument: z.string(),
    position: z.number(),
    positionStatus: z.string(),
    positionPrice: z.number(),
    currentPrice: z.number(),
    oraclePrice: z.number(),
    leverage: z.number(),
    fundingRateFee: z.number(),
    fundingRateFeeUSD: z.number(),
    floatingPnL: z.number(),
    margin: z.number(),
    marginUSD: z.number(),
    oraclePriceDeviationPercentage: z.number(),
  })),
});

export default futuresBalancesSchema;
