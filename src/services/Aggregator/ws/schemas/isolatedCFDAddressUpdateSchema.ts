import { z } from 'zod';
import baseMessageSchema from './baseMessageSchema.js';
import MessageType from '../MessageType.js';
import { isolatedFullOrderSchema, isolatedOrderUpdateSchema } from './isolatedAddressUpdateSchema.js';
import isolatedCFDBalancesSchema from './isolatedCFDBalancesSchema.js';

const baseCfdAddressUpdate = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.ISOLATED_CFD_ADDRESS_UPDATE),
  S: z.string(), // subscription
  uc: z.array(z.enum(['b', 'o'])), // update content
});

const updateMessageSchema = baseCfdAddressUpdate.extend({
  k: z.literal('u'), // kind of message: "u" - updates
  uc: z.array(z.enum(['b', 'o'])), // update content: "o" - orders updates, "b" - balance updates
  b: isolatedCFDBalancesSchema.optional(),
  o: z.tuple([isolatedFullOrderSchema.or(isolatedOrderUpdateSchema)]).optional(),
});

const initialMessageSchema = baseCfdAddressUpdate.extend({
  k: z.literal('i'), // kind of message: "i" - initial
  b: isolatedCFDBalancesSchema,
  o: z.array(isolatedFullOrderSchema)
    .optional(), // When no orders — no field
});

const isolatedCFDAddressUpdateSchema = z.union([
  initialMessageSchema,
  updateMessageSchema,
]);

export default isolatedCFDAddressUpdateSchema
