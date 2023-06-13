import { z } from 'zod';
import { exchanges } from '../../../../constants/index.js';
import orderStatuses from '../../../../constants/orderStatuses.js';
import subOrderStatuses from '../../../../constants/subOrderStatuses.js';
import MessageType from '../MessageType.js';
import balancesSchema from './balancesSchema.js';
import baseMessageSchema from './baseMessageSchema.js';
import executionTypes from '../../../../constants/cfdExecutionTypes.js';

const baseAddressUpdate = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.ADDRESS_UPDATE),
  S: z.string(), // subscription
  uc: z.array(z.enum(['b', 'o'])), // update content
});

const subOrderSchema = z.object({
  i: z.number(), // id
  I: z.string(), // parent order id
  O: z.string(), // sender (owner)
  P: z.string().toUpperCase(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // avg weighed settlement price
  e: z.enum(exchanges), // exchange
  b: z.string(), // broker address
  S: z.enum(subOrderStatuses), // status
  o: z.boolean(), // internal only
});

export const orderUpdateSchema = z.object({
  I: z.string(), // id
  A: z.number(), // settled amount
  S: z.enum(orderStatuses), // status
  l: z.boolean().optional(), // is liquidation order
  t: z.number(), // update time
  E: z.enum(executionTypes).optional(), // execution type
  C: z.string().optional(), // trigger condition
  c: subOrderSchema.array(),
  rpnl: z.number().optional(), // realized PnL
})
  .transform((val) => ({
    ...val,
    k: 'update' as const,
  })).transform((o) => ({
    kind: o.k,
    id: o.I,
    settledAmount: o.A,
    status: o.S,
    liquidated: o.l,
    executionType: o.E,
    triggerCondition: o.C,
    realizedPnL: o.rpnl,
    subOrders: o.c.map((so) => ({
      pair: so.P,
      exchange: so.e,
      id: so.i,
      amount: so.a,
      settledAmount: so.A,
      price: so.p,
      status: so.S,
      side: so.s,
      subOrdQty: so.A,
    })),
  }));

export const fullOrderSchema = z.object({
  I: z.string(), // id
  O: z.string(), // sender (owner)
  P: z.string().toUpperCase(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // price
  F: z.string().toUpperCase(), // fee asset
  f: z.number(), // fee
  o: z.boolean(), // internal only
  S: z.enum(orderStatuses), // status
  T: z.number(), // creation time / unix timestamp
  t: z.number(), // update time
  c: subOrderSchema.array(),
  E: z.enum(executionTypes).optional(), // execution type
  C: z.string().optional(), // trigger condition

  // CFD only
  L: z.number().optional(), // stop limit price,
  l: z.boolean().optional(), // is liquidation order
  rpnl: z.number().optional(), // realized PnL
}).transform((val) => ({
  ...val,
  k: 'full' as const,
})).transform((o) => ({
  kind: o.k,
  id: o.I,
  settledAmount: o.A,
  feeAsset: o.F,
  fee: o.f,
  status: o.S,
  date: o.T,
  clientOrdId: o.O,
  type: o.s,
  pair: o.P,
  amount: o.a,
  price: o.p,
  stopPrice: o.L,
  liquidated: o.l,
  executionType: o.E,
  triggerCondition: o.C,
  realizedPnL: o.rpnl,
  subOrders: o.c.map((so) => ({
    pair: so.P,
    exchange: so.e,
    id: so.i,
    amount: so.a,
    settledAmount: so.A,
    price: so.p,
    status: so.S,
    side: so.s,
    subOrdQty: so.A,
  })),
}));

const updateMessageSchema = baseAddressUpdate.extend({
  k: z.literal('u'), // kind of message: "u" - updates
  uc: z.array(z.enum(['b', 'o'])), // update content: "o" - orders updates, "b" - balance updates
  b: balancesSchema.optional(),
  o: z.tuple([fullOrderSchema.or(orderUpdateSchema)]).optional(),
});

const initialMessageSchema = baseAddressUpdate.extend({
  k: z.literal('i'), // kind of message: "i" - initial
  b: balancesSchema,
  o: z.array(fullOrderSchema)
    .optional(), // When no orders — no field
});

const addressUpdateSchema = z.union([
  initialMessageSchema,
  updateMessageSchema,
]);

export default addressUpdateSchema;
