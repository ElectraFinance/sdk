import { z } from 'zod';

export const paginationInfoSchema = z.object({
  c_page: z.number(),
  t_pages: z.number(),
});
