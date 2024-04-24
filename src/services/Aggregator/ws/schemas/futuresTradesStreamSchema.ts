import { z } from 'zod';
import MessageType from '../MessageType.js';
import { positionSides } from '../../../../constants/positionStatuses';
import { networkCodes, orderSides } from '../../../../constants';
import addressSchema from '../../../../addressSchema';
// import addressSchema from '../../../../addressSchema';

export const futuresTradesStreamSchema = z.object({
  T: z.literal(MessageType.FUTURES_TRADES_STREAM_UPDATE), // futures trades stream update
  _: z.number(), // timestamp
  S: addressSchema, // sender
  id: z.string(), // request id
  i: z.string(), // instrument
  s: z.enum(orderSides), // trade side (SELL/BUY)
  ps: z.enum(positionSides), // trade side (SELL/BUY)
  a: z.string(), // trade amount
  l: z.string(), // leverage
  p: z.string(), // price
  h: z.string(), // transaction hash
  n: z.enum(networkCodes), // network
  rpnl: z.string().optional(), // realized PnL, optional
  rfr: z.string().optional(), // realized FR, optional
  r: z.string().optional(), // ROI in %, optional
});
