import { merge } from 'merge-anything';
import { chains, envs } from '../config/index.js';
import type { networkCodes } from '../constants/index.js';
import Unit from '../Unit/index.js';
import type { SupportedChainId, DeepPartial, VerboseUnitConfig, KnownEnv, MarginMode } from '../types.js';
import { isValidChainId } from '../utils/index.js';
import { simpleFetch } from 'simple-typed-fetch';
import { ReferralSystem } from '../services/ReferralSystem/index.js';
import { BonusSystem } from '../services/BonusSystem/index.js';

type EnvConfig = {
  marginMode: MarginMode
  referralAPI: string
  bonusAPI: string
  networks: Partial<
    Record<
      SupportedChainId,
      VerboseUnitConfig
    >
  >
}

export default class Electra {
  public readonly env?: string;

  public readonly units: Partial<Record<SupportedChainId, Unit>>;

  public readonly referralSystem: ReferralSystem;

  public readonly bonusSystem: BonusSystem;

  constructor(
    envOrConfig: KnownEnv | EnvConfig = 'production',
    overrides?: DeepPartial<EnvConfig>
  ) {
    let config: EnvConfig;
    if (typeof envOrConfig === 'string') {
      const envConfig = envs[envOrConfig];
      if (!envConfig) {
        throw new Error(`Invalid environment: ${envOrConfig}. Available environments: ${Object.keys(envs).join(', ')}`);
      }
      this.env = envOrConfig;
      config = {
        marginMode: envConfig.marginMode,
        referralAPI: envConfig.referralAPI,
        bonusAPI: envConfig.bonusAPI,
        networks: Object.entries(envConfig.networks).map(([chainId, networkConfig]) => {
          if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
          const chainConfig = chains[chainId];
          if (!chainConfig) {
            throw new Error(`Chain config not found: ${chainId}. Available chains: ${Object.keys(chains).join(', ')}`);
          }

          return {
            env: envOrConfig,
            chainId,
            api: networkConfig.api,
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
          };
        })
          .reduce<Partial<Record<SupportedChainId, VerboseUnitConfig>>>((acc, cur) => {
            acc[cur.chainId] = cur;
            return acc;
          }, {}),
      };

      if (overrides) {
        // Recursive merge of config and overrides. Ignore undefined values.
        config = merge(config, overrides);
      }
    } else {
      config = envOrConfig;
    }

    this.referralSystem = new ReferralSystem(config.referralAPI);
    this.bonusSystem = new BonusSystem(config.bonusAPI);

    this.units = Object.entries(config.networks)
      .reduce<Partial<Record<SupportedChainId, Unit>>>((acc, [chainId, networkConfig]) => {
        if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
        const chainConfig = chains[chainId];
        if (!chainConfig) throw new Error(`Chain config not found: ${chainId}`);

        const unit = new Unit({
          // env: networkConfig.env,
          chainId,
          // api: networkConfig.api,
          nodeJsonRpc: networkConfig.nodeJsonRpc,
          services: networkConfig.services,
        });
        return {
          ...acc,
          [chainId]: unit,
        }
      }, {});
  }

  get unitsArray() {
    return Object.entries(this.units).map(([, unit]) => unit);
  }

  getUnit(networkCodeOrChainId: typeof networkCodes[number] | SupportedChainId): Unit {
    let unit: Unit | undefined;
    if (isValidChainId(networkCodeOrChainId)) {
      unit = this.units[networkCodeOrChainId];
    } else {
      unit = this.unitsArray.find((u) => u.networkCode === networkCodeOrChainId);
    }
    if (!unit) {
      throw new Error(
        `Invalid network code: ${networkCodeOrChainId}. ` +
        `Available network codes: ${this.unitsArray.map((u) => u.networkCode).join(', ')}`);
    }
    return unit;
  }

  getSiblingsOf(chainId: SupportedChainId) {
    return this.unitsArray.filter((unit) => unit.chainId !== chainId);
  }

  async getPairs(...params: Parameters<Unit['aggregator']['getPairsList']>) {
    const result: Partial<
      Record<
        string,
        SupportedChainId[]
      >
    > = {};

    await Promise.all(this.unitsArray.map(async (unit) => {
      const pairs = await simpleFetch(unit.aggregator.getPairsList)(...params);
      pairs.forEach((pair) => {
        result[pair] = [
          ...(result[pair] ?? []),
          unit.chainId,
        ];
      });
    }));

    return result;
  }
}
