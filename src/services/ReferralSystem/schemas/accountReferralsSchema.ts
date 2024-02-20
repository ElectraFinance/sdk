import { z } from 'zod';
import { paginationInfoSchema } from './paginationInfoSchema';

const dataSchema = z.object({
  referral: z.string(),
  relative_level: z.number(),
  volume: z.number(),
  points: z.number()
})

export const accountReferralsSchema = z.object({
  data: z.array(dataSchema),
  pagination_info: paginationInfoSchema
})
