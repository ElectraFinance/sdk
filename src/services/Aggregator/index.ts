import { z } from 'zod';
import exchangeInfoSchema from './schemas/exchangeInfoSchema.js';
import cancelOrderSchema from './schemas/cancelOrderSchema.js';
import errorSchema from './schemas/errorSchema.js';
import { AggregatorWS } from './ws';
import type {
  BasicAuthCredentials, IsolatedCFDOrder, SignedCancelOrderRequest, SignedCrossMarginCFDOrder, SignedOrder
} from '../../types.js';
import { pairConfigSchema, futuresBalancesSchema } from './schemas/index.js';
import toUpperCase from '../../utils/toUpperCase.js';
import httpToWS from '../../utils/httpToWS.js';
import { ethers } from 'ethers';
import orderSchema from './schemas/orderSchema.js';
import { fetchWithValidation } from 'simple-typed-fetch';

class Aggregator {
  private readonly apiUrl: string;

  readonly ws: AggregatorWS;

  private readonly basicAuth?: BasicAuthCredentials | undefined;

  get api() {
    return this.apiUrl;
  }

  constructor(
    httpAPIUrl: string,
    wsAPIUrl: string,
    basicAuth?: BasicAuthCredentials
  ) {
    this.apiUrl = httpAPIUrl;
    this.ws = new AggregatorWS(httpToWS(wsAPIUrl));
    this.basicAuth = basicAuth;

    this.getPairConfig = this.getPairConfig.bind(this);
    this.getPairConfigs = this.getPairConfigs.bind(this);
    this.getPairsList = this.getPairsList.bind(this);
    this.placeOrder = this.placeOrder.bind(this);
    this.placeCFDOrder = this.placeCFDOrder.bind(this);
    this.placeCrossMarginOrder = this.placeCrossMarginOrder.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.checkWhitelisted = this.checkWhitelisted.bind(this);
    this.getLockedBalance = this.getLockedBalance.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.getPrices = this.getPrices.bind(this);
  }

  get basicAuthHeaders() {
    if (this.basicAuth) {
      return {
        Authorization: `Basic ${btoa(`${this.basicAuth.username}:${this.basicAuth.password}`)}`,
      };
    }
    return {};
  }

  getOrder = (orderId: string, owner?: string) => {
    if (!ethers.isHexString(orderId)) {
      throw new Error(`Invalid order id: ${orderId}. Must be a hex string`);
    }
    const url = new URL(`${this.apiUrl}/api/v1/order`);
    url.searchParams.append('orderId', orderId);
    if (owner !== undefined) {
      if (!ethers.isAddress(owner)) {
        throw new Error(`Invalid owner address: ${owner}`);
      }
      url.searchParams.append('owner', owner);
    }
    return fetchWithValidation(
      url.toString(),
      orderSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  }

  getPrices = (assetPair: string) => {
    const url = new URL(`${this.apiUrl}/api/v1/prices/`);
    url.searchParams.append('assetPair', assetPair);
    return fetchWithValidation(
      url.toString(),
      z.number(),
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getPairsList = (market: 'futures') => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/list`);
    url.searchParams.append('market', toUpperCase(market));

    return fetchWithValidation(
      url.toString(),
      z.array(z.string().toUpperCase()),
      { headers: this.basicAuthHeaders },
    );
  };

  getPairConfigs = (market: 'spot' | 'futures') => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/exchangeInfo`);
    url.searchParams.append('market', toUpperCase(market));

    return fetchWithValidation(
      url.toString(),
      exchangeInfoSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  }

  getVersion = () => fetchWithValidation(
    `${this.apiUrl}/api/v1/version`,
    z.object({
      serviceName: z.string(),
      version: z.string(),
      apiVersion: z.string(),
    }),
    { headers: this.basicAuthHeaders },
    errorSchema,
  );

  getPairConfig = (assetPair: string) => fetchWithValidation(
    `${this.apiUrl}/api/v1/pairs/exchangeInfo/${assetPair}`,
    pairConfigSchema,
    { headers: this.basicAuthHeaders },
    errorSchema,
  );

  checkWhitelisted = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/v1/whitelist/check?address=${address}`,
    z.boolean(),
    { headers: this.basicAuthHeaders },
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
      ...this.basicAuthHeaders,
    };

    const url = new URL(`${this.apiUrl}/api/v1/order/${isCreateInternalOrder ? 'internal' : ''}`);

    return fetchWithValidation(
      url.toString(),
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
        ...this.basicAuthHeaders,
      },
      body: JSON.stringify({
        ...signedCancelOrderRequest,
        sender: signedCancelOrderRequest.senderAddress,
      }),
    },
    errorSchema,
  );

  placeCFDOrder = (
    signedOrder: IsolatedCFDOrder,
    isReversedOrder?: boolean,
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(isReversedOrder !== undefined) && {
        'X-Reverse-Order': isReversedOrder ? 'true' : 'false',
      },
      ...this.basicAuthHeaders,
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

  placeCrossMarginOrder = (
    signedOrder: SignedCrossMarginCFDOrder,
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.basicAuthHeaders,
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

  getBalance = (address: string) => {
    const url = new URL(`${this.apiUrl}/api/v1/address/futures/balance/${address}`);
    return fetchWithValidation(
      url.toString(),
      futuresBalancesSchema,
    );
  }

  getLockedBalance = (address: string, currency: string) => {
    const url = new URL(`${this.apiUrl}/api/v1/address/balance/reserved/${currency}`);
    url.searchParams.append('address', address);
    return fetchWithValidation(
      url.toString(),
      z.object({
        [currency]: z.number(),
      }).partial(),
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };
}

export * as schemas from './schemas/index.js';
export * as ws from './ws/index.js';
export { Aggregator };
