import { z } from 'zod';

const governanceContractsSchema = z.object({
  isChainSupported: z.boolean(),
});

export default governanceContractsSchema;
