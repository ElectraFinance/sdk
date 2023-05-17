import { z } from 'zod';
import exchangeInfoSchema from './schemas/exchangeInfoSchema.js';
import cancelOrderSchema from './schemas/cancelOrderSchema.js';
import errorSchema from './schemas/errorSchema.js';
import { AggregatorWS } from './ws/index.js';
import type { Exchange, SignedCancelOrderRequest, SignedCFDOrder, SignedOrder } from '../../types.js';
import { pairConfigSchema } from './schemas/index.js';
import {
  aggregatedOrderbookSchema, exchangeOrderbookSchema, poolReservesSchema,
} from './schemas/aggregatedOrderbookSchema.js';
import toUpperCase from '../../utils/toUpperCase.js';
import httpToWS from '../../utils/httpToWS.js';
import { ethers } from 'ethers';
import orderSchema from './schemas/orderSchema.js';
import { exchanges } from '../../constants/index.js';
import { fetchWithValidation } from 'simple-typed-fetch';

class Aggregator {
  private readonly apiUrl: string;

  readonly ws: AggregatorWS;

  get api() {
    return this.apiUrl;
  }

  constructor(
    httpAPIUrl: string,
    wsAPIUrl: string,
  ) {
    this.apiUrl = httpAPIUrl;
    this.ws = new AggregatorWS(httpToWS(wsAPIUrl));

    this.getPairConfig = this.getPairConfig.bind(this);
    this.getPairConfigs = this.getPairConfigs.bind(this);
    this.getPairsList = this.getPairsList.bind(this);
    this.placeOrder = this.placeOrder.bind(this);
    this.placeCFDOrder = this.placeCFDOrder.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.checkWhitelisted = this.checkWhitelisted.bind(this);
    this.getLockedBalance = this.getLockedBalance.bind(this);
    this.getAggregatedOrderbook = this.getAggregatedOrderbook.bind(this);
    this.getExchangeOrderbook = this.getExchangeOrderbook.bind(this);
    this.getPoolReserves = this.getPoolReserves.bind(this);
    this.getVersion = this.getVersion.bind(this);
  }

  getOrder = (orderId: string, owner?: string) => {
    if (!ethers.utils.isHexString(orderId)) {
      throw new Error(`Invalid order id: ${orderId}. Must be a hex string`);
    }
    const url = new URL(`${this.apiUrl}/api/v1/order`);
    url.searchParams.append('orderId', orderId);
    if (owner !== undefined) {
      if (!ethers.utils.isAddress(owner)) {
        throw new Error(`Invalid owner address: ${owner}`);
      }
      url.searchParams.append('owner', owner);
    }
    return fetchWithValidation(
      url.toString(),
      orderSchema,
      undefined,
      errorSchema,
    );
  }

  getPairsList = (market: 'futures') => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/list`);
    url.searchParams.append('market', toUpperCase(market));

    return fetchWithValidation(
      url.toString(),
      z.array(z.string().toUpperCase()),
    );
  };

  getAggregatedOrderbook = (pair: string, depth = 20) => {
    const url = new URL(`${this.apiUrl}/api/v1/orderbook`);
    url.searchParams.append('pair', pair);
    url.searchParams.append('depth', depth.toString());
    return fetchWithValidation(
      url.toString(),
      aggregatedOrderbookSchema,
      undefined,
      errorSchema,
    );
  };

  getAvailableExchanges = () => fetchWithValidation(
    `${this.apiUrl}/api/v1/exchange/list`,
    z.enum(exchanges).array(),
  );

  getExchangeOrderbook = (
    pair: string,
    exchange: Exchange,
    depth = 20,
    filterByBrokerBalances: boolean | null = null,
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/orderbook/${exchange}/${pair}`);
    url.searchParams.append('pair', pair);
    url.searchParams.append('depth', depth.toString());
    if (filterByBrokerBalances !== null) {
      url.searchParams.append('filterByBrokerBalances', filterByBrokerBalances.toString());
    }
    return fetchWithValidation(
      url.toString(),
      exchangeOrderbookSchema,
      undefined,
      errorSchema,
    );
  };

  getPairConfigs = (market: 'spot' | 'futures') => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/exchangeInfo`);
    url.searchParams.append('market', toUpperCase(market));

    return fetchWithValidation(
      url.toString(),
      exchangeInfoSchema,
      undefined,
      errorSchema,
    );
  }

  getPoolReserves = (
    pair: string,
    exchange: Exchange,
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/pools/reserves/${exchange}/${pair}`);
    return fetchWithValidation(
      url.toString(),
      poolReservesSchema,
      undefined,
      errorSchema,
    );
  };

  getVersion = () => fetchWithValidation(
    `${this.apiUrl}/api/v1/version`,
    z.object({
      serviceName: z.string(),
      version: z.string(),
      apiVersion: z.string(),
    }),
    undefined,
    errorSchema,
  );

  getPairConfig = (assetPair: string) => fetchWithValidation(
    `${this.apiUrl}/api/v1/pairs/exchangeInfo/${assetPair}`,
    pairConfigSchema,
    undefined,
    errorSchema,
  );

  checkWhitelisted = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/v1/whitelist/check?address=${address}`,
    z.boolean(),
    undefined,
    errorSchema,
  );

  placeOrder = (
    signedOrder: SignedOrder,
    isCreateInternalOrder: boolean,
    partnerId?: string,
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(partnerId !== undefined) && { 'X-Partner-Id': partnerId },
    };

    return fetchWithValidation(
      `${this.apiUrl}/api/v1/order/${isCreateInternalOrder ? 'internal' : ''}`,
      z.object({
        orderId: z.string(),
        placementRequests: z.array(
          z.object({
            amount: z.number(),
            brokerAddress: z.string(),
            exchange: z.string(),
          }),
        ).optional(),
      }),
      {
        headers,
        method: 'POST',
        body: JSON.stringify(signedOrder),
      },
      errorSchema,
    );
  };

  cancelOrder = (signedCancelOrderRequest: SignedCancelOrderRequest) => fetchWithValidation(
    `${this.apiUrl}/api/v1/order`,
    cancelOrderSchema,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...signedCancelOrderRequest,
        sender: signedCancelOrderRequest.senderAddress,
      }),
    },
    errorSchema,
  );

  placeCFDOrder = (
    signedOrder: SignedCFDOrder
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    return fetchWithValidation(
      `${this.apiUrl}/api/v1/order/futures`,
      z.object({
        orderId: z.string(),
        placementRequests: z.array(
          z.object({
            amount: z.number(),
            brokerAddress: z.string(),
            exchange: z.string(),
          }),
        ).optional(),
      }),
      {
        headers,
        method: 'POST',
        body: JSON.stringify(signedOrder),
      },
      errorSchema,
    );
  };

  getLockedBalance = (address: string, currency: string) => {
    const url = new URL(`${this.apiUrl}/api/v1/address/balance/reserved/${currency}`);
    url.searchParams.append('address', address);
    return fetchWithValidation(
      url.toString(),
      z.object({
        [currency]: z.number(),
      }).partial(),
      undefined,
      errorSchema,
    );
  };
}
export * as schemas from './schemas/index.js';
export * as ws from './ws/index.js';
export { Aggregator };
