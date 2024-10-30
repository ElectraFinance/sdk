import { z } from 'zod';

const aggregatedCommissionHistorySchema = z.object({
  data: z.array(z.object({
    history_type: z.string(),
    date_unix: z.number(),
    date_time_local: z.string(),
    date_time_utc: z.string(),
    amount_token_fmt: z.number(),
    pair: z.string()
  })),
  pagination_info: z.object({
    c_page: z.number(),
    t_pages: z.number()
  })
})

export default aggregatedCommissionHistorySchema;