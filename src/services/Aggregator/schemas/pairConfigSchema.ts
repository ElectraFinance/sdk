import { z } from 'zod';

const pairConfigSchema = z.object({
  maxPrice: z.number(),
  maxQty: z.number(),
  minPrice: z.number(),
  minQty: z.number(),
  name: z.string().toUpperCase(),
  pricePrecision: z.number().int(),
  qtyPrecision: z.number().int(),
});

export default pairConfigSchema;
