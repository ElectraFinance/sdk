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
  instrument: z.string(),
  balance: z.string(),
  amount: z.string(),
  amountNumber: z.string(),
  position: z.string(),
  reason: z.enum(['WITHDRAW', 'DEPOSIT']),
  positionPrice: z.string(),
  fundingRate: z.string(),
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
  data: z.array(baseHistoryItem.extend({ instrumentAddress: z.string() })),
});
const crossMarginHistory = baseHistorySchema.extend({
  data: z.array(baseHistoryItem.extend({ instrumentIndex: z.number() })),
});

const baseHistoryItemTransform = (item: z.infer<typeof baseHistoryItem>) => {
  const { createdAt, reason, transactionHash, amountNumber, instrument } = item;
  const type = historyTransactionType[reason];
  const result = {
    type,
    date: createdAt,
    token: 'USDT',
    instrument,
    amount: amountNumber,
    status: HistoryTransactionStatus.DONE,
    transactionHash,
    user: item.address,
  };

  return result;
};

const cfdHistoryTransform = (response: z.infer<typeof cfdHistory>) => (
  response.data.map(({ instrumentAddress, ...item }) => ({
    ...baseHistoryItemTransform(item),
    instrumentAddress,
  }))
);
const crossMarginHistoryTransform = (response: z.infer<typeof crossMarginHistory>) => (
  response.data.map(({ instrumentIndex, ...item }) => ({
    ...baseHistoryItemTransform(item),
    instrumentIndex,
  }))
);

export const cfdHistorySchema = cfdHistory.transform(cfdHistoryTransform);
export const crossMarginHistorySchema = crossMarginHistory.transform(
  crossMarginHistoryTransform
);
