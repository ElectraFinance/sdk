import { z } from 'zod';

const baseLimitsSchema = z.object({
  FILL_CFD_ORDERS_TRADE_GAS_LIMIT: z.number().int(),
  WITHDRAW_GAS_LIMIT: z.number().int(),
  DEPOSIT_ETH_GAS_LIMIT: z.number().int(),
  DEPOSIT_ERC20_GAS_LIMIT: z.number().int(),
  APPROVE_ERC20_GAS_LIMIT: z.number().int(),
});

export default baseLimitsSchema;
