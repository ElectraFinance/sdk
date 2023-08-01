import { z } from 'zod';
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
  P: z.string().toUpperCase(), // instrument
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // price
  b: z.string(), // broker address
  S: z.enum(subOrderStatuses), // status
  o: z.boolean().optional() // internal only
});

type TSubOrder = z.infer<typeof subOrderSchema>

const getTransformedSubOrders = (subOrders: TSubOrder[]) => {
  return subOrders.map((so) => ({
    id: so.i,
    parentId: so.I,
    sender: so.O,
    instrument: so.P,
    side: so.s,
    amount: so.a,
    settledAmount: so.A,
    price: so.p,
    brokerAddress: so.b,
    status: so.S,
  }))
}

export const orderUpdateSchema = z.object({
  I: z.string(), // id
  A: z.number(), // settled amount
  S: z.enum(orderStatuses), // status
  l: z.boolean().optional(), // is liquidation order
  t: z.number(), // update time
  E: z.enum(executionTypes).optional(), // execution type
  C: z.string().optional(), // trigger condition
  rpnl: z.number().optional(), // realized PnL
  c: subOrderSchema.array(), // sub orders (content)
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
    subOrders: getTransformedSubOrders(o.c),
  }));

export const fullOrderSchema = z.object({
  I: z.string(), // id
  O: z.string(), // sender (owner)
  P: z.string().toUpperCase(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  sltp: z.enum(['STOP_LOSS', 'TAKE_PROFIT']).optional(), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // signed price
  E: z.enum(executionTypes).optional(), // execution type
  C: z.string().optional(), // trigger condition
  F: z.string().toUpperCase(), // fee asset
  f: z.number().optional(), // fee
  o: z.boolean(), // internal only
  S: z.enum(orderStatuses), // status
  ro: z.boolean().optional(), // reversed order
  T: z.number(), // creation time / unix timestamp
  t: z.number(), // update time
  c: subOrderSchema.array(), // sub orders (content)

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
  clientOrdId: o.O,
  instrument: o.P,
  side: o.s,
  sltp: o.sltp,
  amount: o.a,
  settledAmount: o.A,
  price: o.p,
  executionType: o.E,
  triggerCondition: o.C,
  feeAsset: o.F,
  fee: o.f,
  internalOnly: o.o,
  status: o.S,
  date: o.T,
  updateDate: o.t,
  stopPrice: o.L,
  liquidated: o.l,
  realizedPnL: o.rpnl,
  subOrders: getTransformedSubOrders(o.c),
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
