import { z } from 'zod';
import MessageType from '../MessageType.js';
import { positionSides } from '../../../../constants/positionStatuses';
import { networkCodes } from '../../../../constants';
// import addressSchema from '../../../../addressSchema';

export const futuresTradesStreamSchema = z.object({
  T: z.literal(MessageType.FUTURES_TRADES_STREAM_UPDATE), // futures trades stream update
  _: z.number(), // timestamp
  S: z.string(), // sender // TODO: change to addressSchema
  id: z.string(), // request id
  i: z.string(), // instrument
  s: z.enum(positionSides), // trade side (LONG/SHORT)
  a: z.string(), // trade amount
  l: z.string(), // leverage
  p: z.string(), // price
  h: z.string(), // transaction hash
  n: z.enum(networkCodes), // network
  rpnl: z.string().optional(), // realized PnL, optional
  r: z.string().optional(), // ROI in %, optional
});
