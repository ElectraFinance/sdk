import { z } from 'zod';
import { fetchWithValidation } from 'simple-typed-fetch';

import { makePartial } from '../../utils/index.js';

import {
  infoSchema, historySchema,
  cfdContractsSchema,
  cfdHistorySchema,
  crossMarginHistorySchema,
  governanceContractsSchema,
  governanceChainsInfoSchema,
  crossMarginInfoSchema,
  baseLimitsSchema,
  pricesWithQuoteAssetSchema,
} from './schemas/index.js';
import type { BasicAuthCredentials } from '../../types.js';

type CfdHistoryQuery = {
  instrument?: string
  page?: number
  limit?: number
} & Partial<Record<string, string | number>>
class BlockchainService {
  private readonly apiUrl: string;

  private readonly basicAuth?: BasicAuthCredentials | undefined;

  get api() {
    return this.apiUrl;
  }

  constructor(
    apiUrl: string,
    basicAuth?: BasicAuthCredentials
  ) {
    this.apiUrl = apiUrl;
    this.basicAuth = basicAuth;

    this.getInfo = this.getInfo.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getPrices = this.getPrices.bind(this);
    this.getPricesWithQuoteAsset = this.getPricesWithQuoteAsset.bind(this);
    this.getGasPriceWei = this.getGasPriceWei.bind(this);
    this.getBlockNumber = this.getBlockNumber.bind(this);
    this.getCFDContracts = this.getCFDContracts.bind(this);
    this.getCFDHistory = this.getCFDHistory.bind(this);
    this.getCrossMarginHistory = this.getCrossMarginHistory.bind(this);
    this.getCrossMarginInfo = this.getCrossMarginInfo.bind(this);
    this.getGovernanceContracts = this.getGovernanceContracts.bind(this);
    this.getGovernanceChainsInfo = this.getGovernanceChainsInfo.bind(this);
    this.getBaseLimits = this.getBaseLimits.bind(this);
  }

  get basicAuthHeaders() {
    if (this.basicAuth) {
      return {
        Authorization: `Basic ${btoa(`${this.basicAuth.username}:${this.basicAuth.password}`)}`,
      };
    }
    return {};
  }

  get blockchainServiceWsUrl() {
    return `${this.apiUrl}/`;
  }

  private readonly getQueueLength = () => fetchWithValidation(
    `${this.apiUrl}/api/queueLength`,
    z.number().int(),
    { headers: this.basicAuthHeaders }
  );

  get internal() {
    return {
      getQueueLength: this.getQueueLength.bind(this),
    };
  }

  getInfo = () => fetchWithValidation(`${this.apiUrl}/api/info`, infoSchema);

  getBaseLimits = () => fetchWithValidation(
    `${this.apiUrl}/api/baseLimits`,
    baseLimitsSchema,
    { headers: this.basicAuthHeaders }
  );

  getHistory = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/history/${address}`,
    historySchema,
    { headers: this.basicAuthHeaders }
  );

  getPrices = () => fetchWithValidation(
    `${this.apiUrl}/api/prices`,
    z.record(z.string()).transform(makePartial),
    { headers: this.basicAuthHeaders }
  );

  getPricesWithQuoteAsset = () => fetchWithValidation(
    `${this.apiUrl}/api/quotedPrices`,
    pricesWithQuoteAssetSchema,
    { headers: this.basicAuthHeaders }
  );

  getCFDPrices = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/prices`,
    pricesWithQuoteAssetSchema,
    { headers: this.basicAuthHeaders }
  );

  getCrossMarginCFDPrices = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/cross-margin/prices`,
    pricesWithQuoteAssetSchema,
    { headers: this.basicAuthHeaders }
  );

  getGasPriceWei = () => fetchWithValidation(
    `${this.apiUrl}/api/gasPrice`,
    z.string(),
    { headers: this.basicAuthHeaders }
  );

  getBlockNumber = () => fetchWithValidation(
    `${this.apiUrl}/api/blocknumber`,
    z.number().int(),
    { headers: this.basicAuthHeaders }
  );

  getCFDContracts = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/contracts`,
    cfdContractsSchema,
    { headers: this.basicAuthHeaders }
  );

  getGovernanceContracts = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/info`,
    governanceContractsSchema,
    { headers: this.basicAuthHeaders }
  );

  getGovernanceChainsInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/chains-info`,
    governanceChainsInfoSchema,
    { headers: this.basicAuthHeaders }
  );

  getCFDHistory = (address: string, query: CfdHistoryQuery = {}) => {
    const url = new URL(`${this.apiUrl}/api/cfd/deposit-withdraw/${address}`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    return fetchWithValidation(
      url.toString(),
      cfdHistorySchema,
      { headers: this.basicAuthHeaders }
    );
  };

  getCrossMarginInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/cross-margin/info`,
    crossMarginInfoSchema,
    { headers: this.basicAuthHeaders }
  );

  getCrossMarginHistory = (address: string, query: CfdHistoryQuery = {}) => {
    const url = new URL(`${this.apiUrl}/api/cfd/cross-margin/deposit-withdraw/${address}`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    return fetchWithValidation(
      url.toString(),
      crossMarginHistorySchema,
      { headers: this.basicAuthHeaders }
    );
  };
}

export * as schemas from './schemas/index.js';
export { BlockchainService };
