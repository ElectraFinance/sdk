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
} from './schemas/index.js';

type CfdHistoryQuery = {
  instrument?: string
  page?: number
  limit?: number
} & Partial<Record<string, string | number>>
class BlockchainService {
  private readonly apiUrl: string;

  get api() {
    return this.apiUrl;
  }

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getInfo = this.getInfo.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getPrices = this.getPrices.bind(this);
    this.getGasPriceWei = this.getGasPriceWei.bind(this);
    this.getBlockNumber = this.getBlockNumber.bind(this);
    this.getCFDContracts = this.getCFDContracts.bind(this);
    this.getCFDHistory = this.getCFDHistory.bind(this);
    this.getCrossMarginHistory = this.getCrossMarginHistory.bind(this);
    this.getCrossMarginInfo = this.getCrossMarginInfo.bind(this);
    this.getGovernanceContracts = this.getGovernanceContracts.bind(this);
    this.getGovernanceChainsInfo = this.getGovernanceChainsInfo.bind(this);
  }

  get blockchainServiceWsUrl() {
    return `${this.apiUrl}/`;
  }

  private readonly getQueueLength = () => fetchWithValidation(
    `${this.apiUrl}/api/queueLength`,
    z.number().int(),
  );

  get internal() {
    return {
      getQueueLength: this.getQueueLength.bind(this),
    };
  }

  getInfo = () => fetchWithValidation(`${this.apiUrl}/api/info`, infoSchema);

  getHistory = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/history/${address}`,
    historySchema,
  );

  getPrices = () => fetchWithValidation(
    `${this.apiUrl}/api/prices`,
    z.record(z.string()).transform(makePartial),
  );

  getCFDPrices = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/prices`,
    z.record(z.string()).transform(makePartial),
  );

  getGasPriceWei = () => fetchWithValidation(
    `${this.apiUrl}/api/gasPrice`,
    z.string(),
  );

  getBlockNumber = () => fetchWithValidation(`${this.apiUrl}/api/blocknumber`, z.number().int());

  getCFDContracts = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/contracts`,
    cfdContractsSchema,
  );

  getGovernanceContracts = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/info`,
    governanceContractsSchema,
  );

  getGovernanceChainsInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/chains-info`,
    governanceChainsInfoSchema,
  );

  getCFDHistory = (address: string, query: CfdHistoryQuery = {}) => {
    const url = new URL(`${this.apiUrl}/api/cfd/deposit-withdraw/${address}`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    return fetchWithValidation(url.toString(), cfdHistorySchema);
  };

  getCrossMarginInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/cfd/cross-margin/info`,
    crossMarginInfoSchema,
  );

  getCrossMarginHistory = (address: string, query: CfdHistoryQuery = {}) => {
    const url = new URL(`${this.apiUrl}/api/cfd/cross-margin/deposit-withdraw/${address}`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    return fetchWithValidation(url.toString(), crossMarginHistorySchema);
  };
}

export * as schemas from './schemas/index.js';
export { BlockchainService };
