import Electra from '../Electra/index.js';
import { SupportedChainId } from '../types.js';
import express from 'express';
import WebSocket from 'ws';
import http from 'http';
import httpToWS from '../utils/httpToWS.js';
import {
  createHttpTerminator,
} from 'http-terminator';
import { simpleFetch } from 'simple-typed-fetch';
jest.setTimeout(10000);

const createServer = (externalHost: string) => {
  const app = express();
  const server = http.createServer(app);

  const httpTerminator = createHttpTerminator({ server });
  const wss = new WebSocket.Server({ server });

  let externalWs: WebSocket | null = null;

  wss.on('connection', (ws, req) => {
    if (req.url === undefined) throw new Error('req.url is undefined');
    const targetUrl = httpToWS(`${externalHost}${req.url}`);
    externalWs = new WebSocket(targetUrl);

    externalWs.on('open', () => {
      ws.on('message', message => {
        externalWs?.send(message);
      });

      externalWs?.on('message', message => {
        ws.send(message);
      });
    });
  });

  app.get(
    '*',
    (req, res) => {
      (async () => {
        const routeFromURL = req.url;
        try {
          const targetUrl = `${externalHost}${routeFromURL}`;
          const response = await fetch(targetUrl);
          const text = await response.text();
          res.send(text);
        } catch (error) {
          res.status(500).send({
            error: 'Failed to retrieve data from external resource'
          });
        }
      })().catch(console.error)
    });

  server.listen(0);

  const address = server.address();

  if (typeof address === 'string') {
    throw new Error(`Server address is a string: ${address}`);
  }
  const closeWS = () => new Promise((resolve) => {
    wss.close(resolve);
  });

  return {
    port: address?.port,
    terminate: async () => {
      externalWs?.close();
      await closeWS();
      await httpTerminator.terminate();
    }
  }
}

describe('Electra', () => {
  test('Init Electra testing', () => {
    const electra = new Electra('testing');
    expect(electra.unitsArray.length).toBe(4); // eth, bsc, polygon, fantom

    const unitBSC = electra.units[SupportedChainId.BSC_TESTNET];
    expect(unitBSC?.chainId).toBe(SupportedChainId.BSC_TESTNET);
    // expect(unitBSC?.env).toBe('testing');
    expect(electra.getSiblingsOf(SupportedChainId.BSC_TESTNET)).toHaveLength(3);
    expect(unitBSC?.networkCode).toBe('bsc');

    const unitRopsten = electra.units[SupportedChainId.ROPSTEN]
    expect(unitRopsten?.chainId).toBe(SupportedChainId.ROPSTEN);
    // expect(unitRopsten?.env).toBe('testing');
    expect(electra.getSiblingsOf(SupportedChainId.ROPSTEN)).toHaveLength(3);
    expect(unitRopsten?.networkCode).toBe('eth');

    const unitPolygon = electra.units[SupportedChainId.POLYGON_TESTNET];
    expect(unitPolygon?.chainId).toBe(SupportedChainId.POLYGON_TESTNET);
    // expect(unitPolygon?.env).toBe('testing');
    expect(electra.getSiblingsOf(SupportedChainId.POLYGON_TESTNET)).toHaveLength(3);
    expect(unitPolygon?.networkCode).toBe('polygon');

    const unitFantom = electra.units[SupportedChainId.FANTOM_TESTNET];
    expect(unitFantom?.chainId).toBe(SupportedChainId.FANTOM_TESTNET);
    // expect(unitFantom?.env).toBe('testing');
    expect(electra.getSiblingsOf(SupportedChainId.FANTOM_TESTNET)).toHaveLength(3);
    expect(unitFantom?.networkCode).toBe('ftm');
  });

  test('Init Electra production', () => {
    const electra = new Electra();
    expect(electra.env).toBe('production');
    expect(electra.unitsArray.length).toBe(5); // eth, bsc, polygon, fantom, okc

    const unitBSC = electra.units[SupportedChainId.BSC];
    expect(unitBSC?.chainId).toBe(SupportedChainId.BSC);
    // expect(unitBSC?.env).toBe('production');
    expect(electra.getSiblingsOf(SupportedChainId.BSC)).toHaveLength(4);
    expect(unitBSC?.networkCode).toBe('bsc');

    const unitETH = electra.units[SupportedChainId.MAINNET]
    expect(unitETH?.chainId).toBe(SupportedChainId.MAINNET);
    // expect(unitETH?.env).toBe('production');
    expect(electra.getSiblingsOf(SupportedChainId.MAINNET)).toHaveLength(4);
    expect(unitETH?.networkCode).toBe('eth');

    const unitPolygon = electra.units[SupportedChainId.POLYGON];
    expect(unitPolygon?.chainId).toBe(SupportedChainId.POLYGON);
    // expect(unitPolygon?.env).toBe('production');
    expect(electra.getSiblingsOf(SupportedChainId.POLYGON)).toHaveLength(4);
    expect(unitPolygon?.networkCode).toBe('polygon');

    const unitFantom = electra.units[SupportedChainId.FANTOM_OPERA];
    expect(unitFantom?.chainId).toBe(SupportedChainId.FANTOM_OPERA);
    // expect(unitFantom?.env).toBe('production');
    expect(electra.getSiblingsOf(SupportedChainId.FANTOM_OPERA)).toHaveLength(4);
    expect(unitFantom?.networkCode).toBe('ftm');

    const unitOKC = electra.units[SupportedChainId.OKC];
    expect(unitOKC?.chainId).toBe(SupportedChainId.OKC);
    // expect(unitOKC?.env).toBe('production');
    expect(electra.getSiblingsOf(SupportedChainId.OKC)).toHaveLength(4);
    expect(unitOKC?.networkCode).toBe('okc');
  });

  test('Init Electra custom', async () => {
    const server0 = createServer('https://cfd-ethelectra.finance');
    const server1 = createServer('https://cfd-ethelectra.finance');
    const server2 = createServer('https://cfd-ethelectra.finance');

    if (server0.port === undefined || server1.port === undefined || server2.port === undefined) {
      throw new Error('Server port is undefined');
    }

    const blockchainServiceAPI = `http://localhost:${server0.port}`;
    const aggregatorAPI = `http://localhost:${server1.port}`;
    const electraPriceFeedAPI = `http://localhost:${server2.port}`;

    const electra = new Electra({
      networks: {
        1: {
          // api: 'https://api.electra.finance',
          chainId: SupportedChainId.MAINNET,
          nodeJsonRpc: 'https://cloudflare-eth.com/',
          services: {
            blockchainService: {
              http: blockchainServiceAPI,
            },
            aggregator: {
              http: aggregatorAPI + '/backend',
              ws: `http://localhost:${server1.port}/v1`,
            },
            priceFeed: {
              api: electraPriceFeedAPI + '/price-feed',
            },
          },
        }
      }
    });

    const [unit] = electra.unitsArray;
    if (!unit) {
      throw new Error('Electra unit is not defined');
    }
    expect(electra.unitsArray.length).toBe(1); // eth
    expect(unit.chainId).toBe(SupportedChainId.MAINNET);
    // expect(unit.env).toBeUndefined();
    // expect(electra.units[0]?.aggregator.api).toBe('http://localhost:3001');
    expect(unit.aggregator.ws.api).toBe(`ws://localhost:${server1.port}/v1`);
    expect(unit.blockchainService.api).toBe(blockchainServiceAPI);
    expect(unit.priceFeed.api).toBe(electraPriceFeedAPI + '/price-feed');
    expect(unit.provider.connection.url).toBe('https://cloudflare-eth.com/');

    const info = await simpleFetch(unit.blockchainService.getInfo)();
    expect(info).toBeDefined();

    const spotData = await simpleFetch(unit.aggregator.getPairConfigs)('spot');
    expect(spotData).toBeDefined();

    const priceData = await simpleFetch(unit.priceFeed.getCandles)(
      'BTC-USDT',
      Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 30) / 1000), // 1 month ago
      Math.floor(Date.now() / 1000), // now
      '1d'
    );
    expect(priceData).toBeDefined();

    const allTickersDone = await new Promise<boolean>((resolve, reject) => {
      const { unsubscribe } = unit.priceFeed.ws.subscribe(
        'allTickers',
        {
          callback: () => {
            resolve(true);
            unsubscribe();
            clearTimeout(timeout);
          }
        }
      )
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout: ${unit.priceFeed.wsUrl}`));
      }, 10000);
    });
    expect(allTickersDone).toBe(true);

    await server0.terminate();
    await server1.terminate();
    await server2.terminate();
  });

  test('Init Electra testing with overrides', () => {
    const electra = new Electra('testing', {
      networks: {
        [SupportedChainId.BSC_TESTNET]: {
          nodeJsonRpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        }
      }
    });

    const bscUnit = electra.units[SupportedChainId.BSC_TESTNET]
    expect(bscUnit?.provider.connection.url).toBe('https://data-seed-prebsc-1-s1.binance.org:8545/');
  });

  test('Electra Responses', async () => {
    const electra = new Electra('testing');

    const unitBSC = electra.units[SupportedChainId.BSC_TESTNET]
    if (!unitBSC) {
      throw new Error('Electra unit not found');
    }
    const info = await simpleFetch(unitBSC.blockchainService.getInfo)();
    expect(info).toBeDefined();
    expect(info.chainId).toBe(97);
    expect(info.chainName).toBe('bsc-testnet');

    const pairConfigs = await simpleFetch(unitBSC.aggregator.getPairConfigs)('spot');
    expect(pairConfigs).toBeDefined();
    expect(pairConfigs.length).toBeGreaterThan(0);

    const aobusDone = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      unitBSC.aggregator.ws.subscribe('aobus', {
        payload: 'ETHUSDF',
        callback: () => {
          resolve(true);
          unitBSC.aggregator.ws.destroy();
          clearTimeout(timeout);
        }
      })
    });
    expect(aobusDone).toBe(true);
    const candles = await simpleFetch(unitBSC.priceFeed.getCandles)(
      'BTCUSDF',
      Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 30) / 1000), // 1 month ago
      Math.floor(Date.now() / 1000), // now
      '1d'
    );
    expect(candles).toBeDefined();

    const allTickersDone = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 10000);

      const { unsubscribe } = unitBSC.priceFeed.ws.subscribe(
        'allTickers',
        {
          callback: () => {
            resolve(true);
            unsubscribe();
            clearTimeout(timeout);
          }
        }
      )
    });
    expect(allTickersDone).toBe(true);

    const blockNumber = await unitBSC.provider.getBlockNumber();
    expect(blockNumber).toBeDefined();
    const network = await unitBSC.provider.getNetwork();
    expect(network.chainId).toBe(97);
  });

  test('Get Electra unit by networkCode', () => {
    const electraTesting = new Electra('testing');
    const unitBSCTesting = electraTesting.getUnit('bsc');
    expect(unitBSCTesting.chainId).toBe(SupportedChainId.BSC_TESTNET);

    const electraMainnet = new Electra('production');
    const unitBSCMainnet = electraMainnet.getUnit('bsc');
    expect(unitBSCMainnet.chainId).toBe(SupportedChainId.BSC);
  })
});
