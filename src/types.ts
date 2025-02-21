/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { BigNumber } from 'bignumber.js';
import type subOrderStatuses from './constants/subOrderStatuses.js';
import type positionStatuses from './constants/positionStatuses.js';
import type { positionSides } from './constants/positionStatuses.js';
import type { knownEnvs } from './config/schemas';
import type { orderSides, networkCodes } from './constants';

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type AssetPairUpdate = {
  minQty: number;
  pricePrecision: number;
};
export type SubOrder = {
  pair: string;
  exchange: string;
  id: number;
  amount: number;
  settledAmount: number;
  price: number;
  status: (typeof subOrderStatuses)[number];
  side: 'BUY' | 'SELL';
  subOrdQty: number;
};

export type Balance = {
  tradable: string;
  reserved: string;
  contract: string;
  wallet: string;
  allowance: string;
};

export type OrderSide = (typeof orderSides)[number];
export type PositionSide = (typeof positionSides)[number];
export type PositionStatus = (typeof positionStatuses)[number];

type StatesByInstrument = {
  instrument: string;
  positionStatus: PositionStatus;
  currentPrice: string;
  floatingProfitLoss: string;
  accumulatedFundingRate: string;
  position: string;
  positionPrice: string;
  margin: string;
  marginUSD: string;
  leverage: string;
  longFundingRatePerSecond: string;
  longFundingRatePerDay: string;
  shortFundingRatePerSecond: string;
  shortFundingRatePerDay: string;
  stopOutPrice: string | undefined;
};

export type CFDBalance = {
  balance: string;
  profitLoss: string;
  fundingRate: string;
  equity: string;
  reserves: string;
  margin: string | undefined;
  marginUSD: string;
  maintenanceMarginUSD: string;
  freeMarginUSD: string;
  availableWithdrawBalance: string;
  statesByInstruments: StatesByInstrument[];
};

export type IsolatedCFDBalance = {
  instrument: string;
  balance: string;
  profitLoss: string;
  fundingRate: string;
  equity: string;
  position: string;
  currentPrice: string;
  positionPrice: string;
  reserves: string;
  margin: string;
  marginUSD: string;
  freeMarginUSD: string;
  availableWithdrawBalance: string;
  leverage: string;
  status: PositionStatus;
  longFundingRatePerSecond: string;
  longFundingRatePerDay: string;
  shortFundingRatePerSecond: string;
  shortFundingRatePerDay: string;
  stopOutPrice: string | undefined;
};

export type Order = {
  senderAddress: string; // address
  matcherAddress: string; // address
  baseAsset: string; // address
  quoteAsset: string; // address
  matcherFeeAsset: string; // address
  amount: number; // uint64
  price: number; // uint64
  matcherFee: number; // uint64
  nonce: number; // uint64
  expiration: number; // uint64
  buySide: 0 | 1; // uint8, 1=buy, 0=sell
  isPersonalSign: boolean; // bool
};

export type InternalTransfer = {
  from: string; // address
  to: string; // address
  amount: string; // uint112
  expiration: string; // uint64
  nonce: string; // uint64
  chainId: number; // uint64
  reserved: number; // uint192
  signature: string; // bytes
};
export type InternalTransferV2 = {
  from: string; // address
  to: string; // address
  amount: string; // uint112
  expiration: number; // uint64
  nonce: string; // uint64
  chainId: number; // uint64
  signerChainId: number; // uint64
  uniqueHash: string; // bytes32
  externalAddress: string; // bytes
  signature: string; // bytes
};
export type LeverageRequest = {
  senderAddress: string; // address
  instrumentIndex: number; // address
  expiration: number; // uint64
  signerChainId: number; // uint64
  leverage: string; // uint64
  isFromDelegate: boolean; // bytes32
};
export type Leverage = LeverageRequest & {
  signature: string; // bytes
};

export type BonusClaimRequest = {
  address: string; // address
  bonusId: string; // bytes
  chainId: number; // uint64
};
export type BonusClaim = BonusClaimRequest & {
  signature: string; // bytes
};

export type SignedOrder = {
  id: string; // hash of Order (it's not part of order structure in smart-contract)
  signature: string; // bytes
  needWithdraw?: boolean; // bool (not supported yet by smart-contract)
} & Order;

type BaseFuturesOrder = {
  senderAddress: string; // address
  price: number; // uint64
  matcherAddress: string; // address
  price2: number;
  orderType: number;
  amount: number | string; // bigint
  matcherFee: number; // uint64
  expiration: number; // uint64
  buySide: 0 | 1; // uint8, 1=buy, 0=sell
  stopPrice?: number | undefined; // uint64
  leverage?: string | undefined; // string
  isPersonalSign: boolean; // bool
  isFromDelegate?: boolean | undefined; // bool
  signerChainId: number;
  reduceOnly?: boolean;
};

export type IsolatedCFDOrder = {
  instrumentAddress: string;
  nonce: number; // uint64
} & BaseFuturesOrder;

export type CrossMarginCFDOrder = {
  instrumentIndex: number; // uint16
} & BaseFuturesOrder;

export type SignedIsolatedMarginCFDOrder = {
  id: string; // hash of Order (it's not part of order structure in smart-contract)
  signature: string; // bytes
} & IsolatedCFDOrder;

export type SignedCrossMarginCFDOrder = {
  id: string; // hash of Order (it's not part of order structure in smart-contract)
  signature: string; // bytes
  protectedOrderId?: string;
} & CrossMarginCFDOrder;

export type ReplaceFuturesSLTPOrder = {
  blockchainOrder: SignedCrossMarginCFDOrder;
  id: string;
};

export type CancelOrderRequest = {
  id: number | string;
  senderAddress: string;
  isPersonalSign: boolean;
  isFromDelegate?: boolean | undefined;
  signerChainId: number;
};

export type SignedCancelOrderRequest = {
  id: number | string;
  senderAddress: string;
  signature: string;
} & CancelOrderRequest;

export type Pair = {
  name: string;
  baseCurrency: string;
  quoteCurrency: string;
  lastPrice: string;
  openPrice: string;
  change24h: string;
  high: string;
  low: string;
  vol24h: string;
};

export enum SupportedChainId {
  MAINNET = '1',
  BSC = '56',
  FANTOM_OPERA = '250',
  POLYGON = '137',
  OKC = '66',
  OPBNB = '204',
  INEVM = '2525',
  LINEA = '59144',
  AVAX = '43114',
  BASE = '8453',
  ARBITRUM = '42161',
  LUMIA = '994873017',
  TON = '4398026970693',

  BSC_TESTNET = '97',
  SEPOLIA = '11155111',
  EVENT_HORIZON_TESTNET = '123420000034',
  LUMIA_TESTNET = '1952959480',
  TON_TESTNET = '4398026970692',

  // For testing and debug purpose
  // BROKEN = '0',
}

export type NetworkShortName = (typeof networkCodes)[number];

const balanceTypes = ['exchange', 'wallet'] as const;

export type Source = (typeof balanceTypes)[number];
export type Asset = {
  name: string;
  address: string;
};
export type BalanceRequirement = {
  readonly reason: string;
  readonly asset: Asset;
  readonly amount: string;
  readonly sources: Source[];
  readonly spenderAddress?: string | undefined;
};

export type AggregatedBalanceRequirement = {
  readonly asset: Asset;
  readonly sources: Source[];
  readonly spenderAddress?: string | undefined;
  items: Partial<Record<string, string>>;
};

export type ApproveFix = {
  readonly type: 'byApprove';
  readonly targetAmount: BigNumber.Value;
  readonly spenderAddress: string;
};

export type DepositFix = {
  readonly type: 'byDeposit';
  readonly amount: BigNumber.Value;
  readonly asset: string;
};

type Fix = ApproveFix | DepositFix;

export type BalanceIssue = {
  readonly asset: Asset;
  readonly message: string;
  readonly sources: Source[];
  readonly fixes?: Fix[];
};

export type OrderbookItem = {
  price: string;
  amount: string;
  vob: Array<{
    side: 'BUY' | 'SELL';
    pairName: string;
  }>;
};

export type FuturesTradeInfo = {
  futuresTradeRequestId: string;
  sender: string;
  instrument: string;
  buyPrice: number | undefined;
  sellPrice: number | undefined;
  leverage: number;
  buyPower: number;
  sellPower: number;
  minAmount: number;
};

export type FuturesTradesStream = {
  timestamp: number;
  sender: string;
  id: string;
  instrument: string;
  side: OrderSide;
  positionSide: PositionSide;
  amount: string;
  leverage: string;
  price: string;
  txHash: string;
  network: NetworkShortName;
  realizedPnL: string | undefined;
  roi: string | undefined;
};

export enum HistoryTransactionStatus {
  PENDING = 'Pending',
  DONE = 'Done',
  APPROVING = 'Approving',
  CANCELLED = 'Cancelled',
}

export type BasicAuthCredentials = {
  username: string;
  password: string;
};

export type VerboseUnitConfig = {
  // env?: string;
  // api: string;
  chainId: SupportedChainId;
  nodeJsonRpc: string;
  services: {
    blockchainService: {
      http: string;
      // For example:
      // http://localhost:3001/,
      // http://10.123.34.23:3001/,
      // https://blockchain:3001/
    };
    aggregator: {
      http: string;
      ws: string;
      // For example:
      // http://localhost:3002/,
      // http://10.34.23.5:3002/,
      // https://aggregator:3002/
    };
    priceFeed: {
      api: string;
      // For example:
      // http://localhost:3003/,
      // http://10.23.5.11:3003/,
      // https://price-feed:3003/
    };
  };
  basicAuth?: BasicAuthCredentials;
};

export type KnownEnv = (typeof knownEnvs)[number];

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type MarginMode = 'cross' | 'isolated';

export enum OrderType {
  LIMIT = 0,
  MARKET = 1,
  TAKE_PROFIT = 2,
  STOP_LOSS = 4,
  STOP_LIMIT = 8,
}
