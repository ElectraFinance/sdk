import { ethers } from 'ethers';
import { Aggregator } from '../services/Aggregator/index.js';
import { BlockchainService } from '../services/BlockchainService/index.js';
import { PriceFeed } from '../services/PriceFeed/index.js';
import type { CrossMarginCFDOrder, KnownEnv, SupportedChainId, VerboseUnitConfig } from '../types.js';
import { chains, envs } from '../config/index.js';
import { DEFAULT_EXPIRATION, type networkCodes } from '../constants/index.js';
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

  // async makePositionCloseOrder(address: string, symbol: string, type: 'isolated'): Promise<CFDOrder>
  // async makePositionCloseOrder(address: string, symbol: string, type: 'cross'): Promise<CrossMarginCFDOrder>
  async makePositionCloseOrder(address: string, symbol: string, type: 'cross') {
    const { instruments } = await simpleFetch(this.blockchainService.getCrossMarginInfo)();
    const instrumentInfo = instruments[symbol];
    if (instrumentInfo === undefined) {
      throw new Error(`Instrument ${symbol} not found. Available instruments: ${Object.keys(instruments).join(', ')}`);
    }

    const { statesByInstruments } = await simpleFetch(this.aggregator.getBalance)(address);
    const instrumentState = statesByInstruments[symbol];
    if (instrumentState === undefined) {
      throw new Error(`Instrument state ${symbol} not found. Available instruments: ${Object.keys(statesByInstruments).join(', ')}`);
    }
    const { position, currentPrice } = instrumentState;
    const { matcherAddress } = await simpleFetch(this.blockchainService.getInfo)();

    const { totalFee } = await this.calculateFee(symbol, position, type);
    const nonce = Date.now();
    const expiration = nonce + DEFAULT_EXPIRATION;

    const isShort = position < 0; // Sell

    return {
      senderAddress: address,
      matcherAddress,
      instrumentIndex: instrumentInfo.id,
      amount: position,
      price: currentPrice,
      matcherFee: totalFee.toNumber(),
      nonce,
      expiration,
      side: isShort ? 'BUY' as const : 'SELL' as const,
      isPersonalSign: false,
    }
  }

  async calculateFee(symbol: string, amount: BigNumber.Value, type: 'cross' | 'isolated') {
    const feeAssetName = 'USDT';
    const { assetToAddress } = await simpleFetch(this.blockchainService.getInfo)();
    const {
      FILL_CFD_ORDERS_TRADE_GAS_LIMIT
    } = await simpleFetch(this.blockchainService.getBaseLimits)();

    let feePercent: number;
    let symbolPrice: string | undefined;
    if (type === 'isolated') {
      const CFDContracts = await simpleFetch(this.blockchainService.getCFDContracts)();
      const contractInfo = CFDContracts.find((c) => c.name === symbol);
      if (contractInfo === undefined) {
        throw new Error(`CFD contract ${symbol} not found`);
      }
      feePercent = contractInfo.feePercent;

      const CFDPrices = await simpleFetch(this.blockchainService.getCFDPrices)();
      if (!(symbol in CFDPrices)) throw new Error(`CFD price ${symbol} not found`);
      symbolPrice = CFDPrices[symbol];
    } else {
      const { instruments } = await simpleFetch(this.blockchainService.getCrossMarginInfo)();
      const instrumentInfo = instruments[symbol];
      if (instrumentInfo === undefined) {
        throw new Error(`Instrument ${symbol} not found`);
      }
      feePercent = instrumentInfo.feePercent;
      const CFDPrices = await simpleFetch(this.blockchainService.getCrossMarginCFDPrices)();
      if (!(symbol in CFDPrices)) throw new Error(`CFD price ${symbol} not found`);
      symbolPrice = CFDPrices[symbol];
    }
    if (symbolPrice === undefined) throw new Error(`Price for ${symbol} not found`);

    const gasPriceWei = await simpleFetch(this.blockchainService.getGasPriceWei)();
    const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei');

    const prices = await simpleFetch(this.blockchainService.getPrices)();
    const baseCurrencyPriceInELT = prices[ethers.constants.AddressZero];
    if (baseCurrencyPriceInELT === undefined) throw new Error(`Base currency ${this.baseCurrencyName} price not found. Available: ${Object.keys(prices).join(', ')}`);
    const feeAssetAddress = assetToAddress[feeAssetName];
    if (feeAssetAddress === undefined) throw new Error(`Fee asset ${feeAssetName} address not found`);
    const feeAssetPriceInELT = prices[feeAssetAddress];
    if (feeAssetPriceInELT === undefined) throw new Error(`Fee asset ${feeAssetName} not found. Available: ${Object.keys(prices).join(', ')}`);

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
