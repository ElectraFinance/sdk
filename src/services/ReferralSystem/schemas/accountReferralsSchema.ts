import { z } from 'zod';
import { paginationInfoSchema } from './paginationInfoSchema';

const dataSchema = z.object({
  referral: z.string(),
  relative_level: z.number(),
  volume: z.number(),
  points: z.number(),
});

export const accountReferralsSchema = z.object({
  data: z.array(dataSchema),
  pagination_info: paginationInfoSchema,
});

export const bitgetReferralsSchema = z.array(z.string());

export const tmaUserPoints = z.object({
  status: z.string(),
  points: z.string(),
  status_of_claim: z.string(),
});

export const calimPointsResultSchema = z.object({
  status: z.string(),
});

export type AccountReferrals = z.infer<typeof accountReferralsSchema>;

export const bitgetVolumesSchema = z.record(z.string(), z.number());
