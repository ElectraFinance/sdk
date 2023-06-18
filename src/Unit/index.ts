import { ethers } from 'ethers';
import { Aggregator } from '../services/Aggregator/index.js';
import { BlockchainService } from '../services/BlockchainService/index.js';
import { PriceFeed } from '../services/PriceFeed/index.js';
import type { KnownEnv, SupportedChainId, VerboseUnitConfig } from '../types.js';
import { chains, envs } from '../config/index.js';
import type { networkCodes } from '../constants/index.js';
import { simpleFetch } from 'simple-typed-fetch';
import calculateNetworkFee from '../utils/calculateNetworkFee.js';
import { BigNumber } from 'bignumber.js';

type KnownConfig = {
  env: KnownEnv
  chainId: SupportedChainId
}

export default class Unit {
  public readonly networkCode: typeof networkCodes[number];

  public readonly baseCurrencyName: string;

  public readonly chainId: SupportedChainId;

  public readonly provider: ethers.providers.StaticJsonRpcProvider;

  public readonly blockchainService: BlockchainService;

  public readonly aggregator: Aggregator;

  public readonly priceFeed: PriceFeed;

  public readonly config: VerboseUnitConfig;

  constructor(config: KnownConfig | VerboseUnitConfig) {
    if ('env' in config) {
      const staticConfig = envs[config.env];
      if (!staticConfig) throw new Error(`Invalid environment: ${config.env}. Available environments: ${Object.keys(envs).join(', ')}`);

      const chainConfig = chains[config.chainId];
      if (!chainConfig) throw new Error(`Invalid chainId: ${config.chainId}. Available chainIds: ${Object.keys(chains).join(', ')}`);

      const networkConfig = staticConfig.networks[config.chainId];
      if (!networkConfig) throw new Error(`Invalid chainId: ${config.chainId}. Available chainIds: ${Object.keys(staticConfig.networks).join(', ')}`);

      this.config = {
        chainId: config.chainId,
        nodeJsonRpc: networkConfig.rpc ?? chainConfig.rpc,
        services: {
          blockchainService: {
            http: networkConfig.api + networkConfig.services.blockchain.http,
          },
          aggregator: {
            http: networkConfig.api + networkConfig.services.aggregator.http,
            ws: networkConfig.api + networkConfig.services.aggregator.ws,
          },
          priceFeed: {
            api: networkConfig.api + networkConfig.services.priceFeed.all,
          },
        },
      }
    } else {
      this.config = config;
    }
    const chainInfo = chains[config.chainId];
    if (!chainInfo) throw new Error('Chain info is required');

    this.chainId = config.chainId;
    this.networkCode = chainInfo.code;
    this.baseCurrencyName = chainInfo.baseCurrencyName;
    const intNetwork = parseInt(this.chainId, 10);
    if (Number.isNaN(intNetwork)) throw new Error('Invalid chainId (not a number)' + this.chainId);
    this.provider = new ethers.providers.StaticJsonRpcProvider(this.config.nodeJsonRpc, intNetwork);
    this.provider.pollingInterval = 1000;

    this.blockchainService = new BlockchainService(
      this.config.services.blockchainService.http,
      this.config.basicAuth,
    );
    this.aggregator = new Aggregator(
      this.config.services.aggregator.http,
      this.config.services.aggregator.ws,
      this.config.basicAuth,
    );
    this.priceFeed = new PriceFeed(
      this.config.services.priceFeed.api,
      this.config.basicAuth,
    );
  }

  async calculateFee(symbol: string, amount: BigNumber.Value) {
    const feeAssetName = 'USDT';
    const CFDContracts = await simpleFetch(this.blockchainService.getCFDContracts)();
    const contractInfo = CFDContracts.find((c) => c.name === symbol);
    if (contractInfo === undefined) {
      throw new Error(`CFD contract ${symbol} not found`);
    }
    const { feePercent } = contractInfo;
    const CFDPrices = await simpleFetch(this.blockchainService.getCFDPrices)();
    const symbolPrice = CFDPrices[symbol];
    if (symbolPrice === undefined) throw new Error(`CFD price ${symbol} not found`);
    const {
      FILL_CFD_ORDERS_TRADE_GAS_LIMIT
    } = await simpleFetch(this.blockchainService.getBaseLimits)();
    const gasPriceWei = await simpleFetch(this.blockchainService.getGasPriceWei)();
    const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei');

    const prices = await simpleFetch(this.blockchainService.getPrices)();
    const baseCurrencyPriceInELT = prices[ethers.constants.AddressZero];
    if (baseCurrencyPriceInELT === undefined) throw new Error(`Base currency ${this.baseCurrencyName} price not found. Available: ${Object.keys(prices).join(', ')}`);
    const feeAssetPriceInELT = prices[feeAssetName];
    if (feeAssetPriceInELT === undefined) throw new Error(`Fee asset ${feeAssetName} not found`);

    const networkFee = calculateNetworkFee(
      gasPriceGwei.toString(),
      FILL_CFD_ORDERS_TRADE_GAS_LIMIT
    )

    const amountBN = new BigNumber(amount);
    const priceForFee = new BigNumber(symbolPrice);

    const networkFeeInElt = new BigNumber(networkFee)
      .multipliedBy(baseCurrencyPriceInELT)
      .toString();

    const networkFeeInFeeAsset = new BigNumber(networkFeeInElt)
      .multipliedBy(
        new BigNumber(1)
          .div(feeAssetPriceInELT),
      ).toString();

    const fee = new BigNumber(priceForFee)
      .multipliedBy(amountBN)
      .multipliedBy(feePercent)
      .div(100);

    const totalFee = fee.plus(networkFeeInFeeAsset);

    return {
      networkFee,
      networkFeeInElt,
      networkFeeInFeeAsset,
      fee,
      totalFee
    }
  }
}
