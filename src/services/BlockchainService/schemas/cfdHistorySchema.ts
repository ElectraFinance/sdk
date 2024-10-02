import { z } from 'zod';
import { HistoryTransactionStatus } from '../../../types.js';

export enum historyTransactionType {
  WITHDRAW = 'withdrawal',
  DEPOSIT = 'deposit',
}

const baseHistoryItem = z.object({
  _id: z.string(),
  __v: z.number(),
  address: z.string(),
  balance: z.string().optional(),
  amount: z.string(),
  amountNumber: z.string(),
  reason: z.enum(['WITHDRAW', 'DEPOSIT']),
  transactionHash: z.string(),
  blockNumber: z.number(),
  createdAt: z.number(),
});

const baseHistorySchema = z.object({
  success: z.boolean(),
  count: z.number(),
  total: z.number(),
  pagination: z.object({}),
});

const cfdHistory = baseHistorySchema.extend({
  data: z.array(baseHistoryItem.extend({
    instrumentAddress: z.string(),
    instrument: z.string(),
    position: z.string(),
    positionPrice: z.string(),
    fundingRate: z.string(),
  })),
});
const crossMarginHistory = baseHistorySchema.extend({
  data: z.array(baseHistoryItem),
});

const baseHistoryItemTransform = (item: z.infer<typeof baseHistoryItem>) => {
  const { createdAt, reason, transactionHash, amountNumber } = item;
  const type = historyTransactionType[reason];
  const result = {
    type,
    date: createdAt,
    token: 'USDT',
    amount: amountNumber,
    status: HistoryTransactionStatus.DONE,
    transactionHash,
    user: item.address,
  };

  return result;
};

const cfdHistoryTransform = (response: z.infer<typeof cfdHistory>) => (
  response.data.map(({
    instrumentAddress,
    instrument,
    position,
    positionPrice,
    fundingRate,
    ...item
  }) => ({
    ...baseHistoryItemTransform(item),
    instrumentAddress,
    instrument,
    position,
    positionPrice,
    fundingRate,
  }))
);
const crossMarginHistoryTransform = (response: z.infer<typeof crossMarginHistory>) => (
  response.data.map(baseHistoryItemTransform)
);

export const cfdHistorySchema = cfdHistory.transform(cfdHistoryTransform);
export const crossMarginHistorySchema = crossMarginHistory.transform(
  crossMarginHistoryTransform
);
