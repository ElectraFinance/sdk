import { z } from 'zod';

const linkSchema = z.object({
  referer: z.string(),
  ref_link: z.string(),
  option: z.number().optional(),
});

export default linkSchema;
