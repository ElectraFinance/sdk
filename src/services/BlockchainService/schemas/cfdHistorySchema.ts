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
  instrumentAddress: z.string().optional(),
  instrumentIndex: z.number().optional(),
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

const baseHistorySchema = z
  .object({
    success: z.boolean(),
    count: z.number(),
    total: z.number(),
    pagination: z.object({}),
    data: z.array(baseHistoryItem),
  })
  .transform((response) => {
    return response.data.map((item) => {
      const {
        createdAt,
        reason,
        transactionHash,
        amountNumber,
        instrument,
      } = item;
      const type = historyTransactionType[reason];

      return {
        type,
        date: createdAt,
        token: 'USDT',
        instrument,
        amount: amountNumber,
        status: HistoryTransactionStatus.DONE,
        transactionHash,
        user: item.address,
      };
    });
  });

export const cfdHistorySchema = baseHistorySchema.transform((response) => {
  return { ...response, instrumentAddress: z.string() };
});

export const crossMarginHistorySchema = baseHistorySchema.transform((response) => {
  return { ...response, instrumentIndex: z.number() }
});
