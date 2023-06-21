import { z } from 'zod';
import positionStatuses from '../../../../constants/positionStatuses.js';

const sbiSchema = z
  .object({
    i: z.string(), // instrument
    s: z.enum(positionStatuses), // position status
    cp: z.string(), // current price
    pnl: z.string(), // floating profit & loss
    fr: z.string(), // accumulated funding rate
    p: z.string(), // position
    pp: z.string(), // position price
    m: z.string(), // margin
    mu: z.string(), // margin in USD
    l: z.string(), // leverage
    lfrs: z.string(), // long funding rate per second
    lfrd: z.string(), // long funding rate per day
    sfrs: z.string(), // short funding rate per second
    sfrd: z.string(), // short funding rate per day
    sop: z.string().optional() // stop out price
  })

export const cfdBalanceSchema = z
  .object({
    b: z.string(), // balance
    pnl: z.string(), // total floating profit & loss
    fr: z.string(), // total accumulated funding rate
    e: z.string(), // equity
    r: z.string(), // total reserves
    m: z.string(), // total margin
    mu: z.string(), // total margin in USD
    fmu: z.string(), // total free margin in USD
    awb: z.string(), // available withdraw balance
    sbi: sbiSchema.array() // states by instruments
  })
  .transform((obj) => {
    const sbi = obj.sbi.map((state) => {
      return {
        instrument: state.i,
        positionStatus: state.s,
        currentPrice: state.cp,
        floatingProfitLoss: state.pnl,
        accumulatedFundingRate: state.fr,
        position: state.p,
        positionPrice: state.pp,
        margin: state.m,
        marginUSD: state.mu,
        leverage: state.l,
        longFundingRatePerSecond: state.lfrs,
        longFundingRatePerDay: state.lfrd,
        shortFundingRatePerSecond: state.sfrs,
        shortFundingRatePerDay: state.sfrd,
        stopOutPrice: state.sop,
      }
    });

    return {
      balance: obj.b,
      profitLoss: obj.pnl,
      fundingRate: obj.fr,
      equity: obj.e,
      reserves: obj.r,
      margin: obj.m,
      marginUSD: obj.mu,
      freeMarginUSD: obj.fmu,
      availableWithdrawBalance: obj.awb,
      statesByInstruments: sbi,
    }
  });

const cfdBalancesSchema = z.array(cfdBalanceSchema);

export default cfdBalancesSchema;
