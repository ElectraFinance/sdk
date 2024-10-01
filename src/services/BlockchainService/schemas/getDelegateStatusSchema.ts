import { z } from 'zod';

const activeRequest = z.object({
  trader: z.string(),
  delegate: z.string(),
  deadline: z.number(),
  status: z.string(),
  transactionHashes: z.array(z.string()),
});

const getDelegateStatusSchema = z.object({
  deadline: z.number(),
  activeRequests: z.array(activeRequest),
});

export default getDelegateStatusSchema;
