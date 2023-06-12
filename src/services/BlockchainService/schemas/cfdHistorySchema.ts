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

type BaseTransform = {
  type: historyTransactionType
  date: number
  token: string
  instrument: string
  amount: string
  status: HistoryTransactionStatus.DONE
  transactionHash: string
  user: string
  instrumentAddress?: string | undefined
  instrumentIndex?: number | undefined
}

const baseHistorySchema = z
  .object({
    success: z.boolean(),
    count: z.number(),
    total: z.number(),
    pagination: z.object({}),
    data: z.array(baseHistoryItem),
  });

enum SchemaType {
  SINGLE = 'single',
  CROSSMARGIN = 'cross',
}

const baseTransform = (response: z.infer<typeof baseHistorySchema>, schemaType: SchemaType): BaseTransform[] => {
  return response.data.map((item) => {
    const {
      createdAt,
      reason,
      transactionHash,
      amountNumber,
      instrument,
      instrumentAddress,
      instrumentIndex,
    } = item;
    const type = historyTransactionType[reason];
    const result: BaseTransform = {
      type,
      date: createdAt,
      token: 'USDT',
      instrument,
      amount: amountNumber,
      status: HistoryTransactionStatus.DONE,
      transactionHash,
      user: item.address,
    }

    if (schemaType === SchemaType.SINGLE) {
      result.instrumentAddress = instrumentAddress;
    } else {
      result.instrumentIndex = instrumentIndex;
    }

    return result;
  });
};

export const cfdHistorySchema = baseHistorySchema.transform((response) => baseTransform(response, SchemaType.SINGLE));
export const crossMarginHistorySchema = baseHistorySchema.transform((response) => baseTransform(response, SchemaType.CROSSMARGIN));
