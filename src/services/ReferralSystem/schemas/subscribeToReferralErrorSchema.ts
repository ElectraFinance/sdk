import { errorSchema } from './errorSchema';
import { z } from 'zod';

export const subscribeToReferralErrorSchema = errorSchema.extend({
  ref_link: z.string().optional()
})
