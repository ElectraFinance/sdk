import 'dotenv/config';

import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';
import { CrossMarginCFD__factory, ERC20__factory } from '@electra.finance/contracts/lib/ethers-v5/index.js';

import type { FuturesTradeInfo } from '../src/index.js';
import { Electra, SupportedChainId, crypt } from '../src/index.js';
import { BigNumber } from 'bignumber.js';
import type { fullOrderSchema } from '../src/services/Aggregator/ws/schemas/addressUpdateSchema.js';
import type { z } from 'zod';

// HOW TO EXECUTE THIS EXAMPLE

// 1. Create a wallet with some BNB on BSC testnet or use an existing one
// 2. Install dependencies: `npm i`
// 3. Create a `.env` file with the following content:
//    ```
//    PRIVATE_KEY=YOUR_PRIVATE_KEY
//    HOST=YOUR_HOST
//    ```
// 4. Run this example with `npm run examples:liquidation`

const PRIVATE_KEY = process.env['PRIVATE_KEY'];
const HOST = process.env['HOST'];

if (PRIVATE_KEY === undefined) {
  throw new Error('PRIVATE_KEY is not defined');
}

if (HOST === undefined) {
  throw new Error('HOST is not defined');
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// const MARGIN_LEVEL_THRESHOLD = 80;
const SLIPPAGE_PERCENT = 1;
const LEVERAGE = 100;
const DEPOSIT_AMOUNT = '20';

const instrumentsToTest = [
  {
    name: 'BTCUSDF',
    minAmount: 0.01,
  }, {
    name: 'ETHUSDF',
    minAmount: 0.1,
  }, {
    name: 'XRPUSDF',
    minAmount: 20,
  },
  {
    name: 'FTMUSDF',
    minAmount: 50,
  },
  {
    name: 'BNBUSDF',
    minAmount: 0.1,
  },
];
const stopPrice = undefined; // optional

const testLiquidation = async (instrumentName: string, amnt: number) => {
  console.log(`Testing ${instrumentName}...`);
  const electra = new Electra({
    marginMode: 'cross',
    referralAPI: '',
    networks: {
      97: {
        chainId: SupportedChainId.BSC_TESTNET,
        nodeJsonRpc: HOST + '/rpc',
        services: {
          blockchainService: {
            http: HOST,
          },
          aggregator: {
            http: HOST + '/backend',
            ws: HOST + '/v1',
          },
          priceFeed: {
            api: HOST + '/price-feed',
          },
        }
      },
    },
  });

  const unit = electra.getUnit(SupportedChainId.BSC_TESTNET);

  // unit.aggregator.ws.logger = console.log;
  unit.aggregator.ws.init();

  await delay(1000);

  const getFuturesInfo = (
    walletAddress: string,
    instrument: string,
    amount: number,
    feePercent: number, // 0.01 / 100
    networkFee: number,
  ) => {
    let timeout: ReturnType<typeof setTimeout>;

    return new Promise<FuturesTradeInfo>((resolve, reject) => {
      const subId = unit.aggregator.ws.subscribe('fts', {
        payload: {
          s: walletAddress,
          i: instrument,
          a: amount,
          sl: SLIPPAGE_PERCENT / 100,
          l: LEVERAGE,
          F: feePercent,
          f: networkFee,
        },
        callback: data => {
          clearTimeout(timeout);
          unit.aggregator.ws.unsubscribe(subId, 'FUTURES');
          resolve(data);
        }
      })
      timeout = setTimeout(() => {
        unit.aggregator.ws.unsubscribe(subId, 'FUTURES');

        reject(new Error(`${instrumentName}: Futures info timeout`));
      }, 10000);
    })
  }

  const getPriceChange24h = (s: string) => {
    let timeout: ReturnType<typeof setTimeout>;

    return new Promise<number>((resolve, reject) => {
      const { unsubscribe } = unit.priceFeed.ws.subscribe('ticker', {
        payload: s,
        callback: ({ openPrice, lastPrice }) => {
          clearTimeout(timeout);
          unsubscribe();
          resolve(new BigNumber(openPrice).isZero()
            ? 0
            : new BigNumber(lastPrice)
              .div(openPrice)
              .minus(1)
              .multipliedBy(100)
              .toNumber());
        }
      })
      timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`${instrumentName}: Price feed timeout for ${s}`));
      }, 10000);
    })
  }

  // const getPositions = (walletAddress: string) => {
  //     return new Promise<CFDBalance[]>((resolve, reject) => {
  //         const subId = unit.aggregator.ws.subscribe('ausf', {
  //             payload: walletAddress,
  //             callback: data => {
  //                 unit.aggregator.ws.unsubscribe(subId);
  //                 unit.aggregator.ws.destroy();
  //                 if(data.balances) resolve(data.balances);
  //             }
  //         })
  //         setTimeout(() => reject(new Error('Timeout')), 10000);
  //     });
  // }

  // const getPositionByInstrument = async (addr: string, i: string) => {
  //     const positions = await getPositions(addr);
  //     return positions.find(p => p.instrument === i);
  // }

  const waitOrderSettlement = (address: string, orderId: string) => {
    let timeout: ReturnType<typeof setTimeout>;

    return new Promise<void>((resolve, reject) => {
      unit.aggregator.ws.subscribe('ausf', {
        payload: address,
        callback: data => {
          if (data.kind === 'initial') {
            console.log(`Connected to WS. Total orders: ${data.orders?.length ?? 0}. Waiting for order ${orderId} settlement...`);
            const order = data.orders?.find(o => o.id === orderId);
            if (order?.status === 'SETTLED') {
              clearTimeout(timeout);
              unit.aggregator.ws.unsubscribe(address, 'FUTURES');
              resolve();
            } else if (order?.status === 'FAILED') {
              clearTimeout(timeout);
              unit.aggregator.ws.unsubscribe(address, 'FUTURES');
              reject(new Error(`${instrumentName}: Order failed`));
            }
          } else {
            if (data.order) {
              console.log(`${instrumentName}: Got order ${data.order.id} status: ${data.order.status}`);
              if (data.order.id === orderId && data.order.status === 'SETTLED') {
                clearTimeout(timeout);
                unit.aggregator.ws.unsubscribe(address, 'FUTURES');
                resolve();
              } else if (data.order.id === orderId && data.order.status === 'FAILED') {
                clearTimeout(timeout);
                unit.aggregator.ws.unsubscribe(address, 'FUTURES');
                reject(new Error(`${instrumentName}: Order failed`));
              }
            }
          }
        }
      })
      timeout = setTimeout(() => {
        unit.aggregator.ws.unsubscribe(address, 'FUTURES');
        reject(new Error(`${instrumentName}: Order settlement timeout`));
      }, 60 * 1000);
    })
  }

  // Returns margin level
  const waitPositionOpen = (address: string, instrument: string) => {
    let timeout: ReturnType<typeof setTimeout>;

    return new Promise<[number, number]>((resolve, reject) => {
      unit.aggregator.ws.subscribe('ausf', {
        payload: address,
        callback: data => {
          const { balance } = data;
          if (balance) {
            const position = balance.statesByInstruments.find((s) => s.instrument === instrument);
            if (position && parseFloat(position.position) !== 0) {
              const positionMarginLevel = new BigNumber(balance.equity)
                .div(position.marginUSD)
                .multipliedBy(100)
                .toNumber();

              const marginLevel = new BigNumber(balance.equity)
                .div(balance.marginUSD)
                .multipliedBy(100)
                .toNumber();

              clearTimeout(timeout);
              unit.aggregator.ws.unsubscribe(address, 'FUTURES');
              resolve([positionMarginLevel, marginLevel]);
            }
          }
        }
      })
      timeout = setTimeout(() => {
        unit.aggregator.ws.unsubscribe(address, 'FUTURES');

        reject(new Error(`${instrumentName}: Position open timeout`));
      }, 30000);
    })
  }

  const waitLiquidationOrder = (address: string, instrument: string) => {
    let timeout: ReturnType<typeof setTimeout>;

    let orders: Array<z.infer<typeof fullOrderSchema>> = [];

    return new Promise<string>((resolve, reject) => {
      unit.aggregator.ws.subscribe('ausf', {
        payload: address,
        callback: data => {
          if (data.kind === 'initial') {
            orders = data.orders ?? [];
          } else {
            const { order, balance } = data;
            const instrumentPosition = balance?.statesByInstruments.find((s) => s.instrument === instrument);

            if (balance && instrumentPosition) {
              const positionMarginLevel = new BigNumber(balance.equity)
                .div(instrumentPosition.marginUSD)
                .multipliedBy(100)
                .toNumber();

              const marginLevel = new BigNumber(balance.equity)
                .div(balance.marginUSD)
                .multipliedBy(100)
                .toNumber();

              console.log(`${instrumentName}: ML: ${marginLevel}, PML: ${positionMarginLevel}`);
            }
            if (order) {
              if (order.kind === 'full') {
                orders.push(order);
              } else {
                orders = orders.map(o => o.id === order.id
                  ? {
                    ...o,
                    status: order.status,
                    liquidated: order.liquidated,
                    subOrders: order.subOrders,
                    settledAmount: order.settledAmount,
                    executionType: order.executionType,
                    realizedPnL: order.realizedPnL,
                    triggerCondition: order.triggerCondition,
                  }
                  : o);
              }
            }
          }

          const liquidationOrder = orders.find(o => o.instrument === instrument &&
          o.status === 'FILLED' &&
          o.liquidated
          );
          if (liquidationOrder) {
            clearTimeout(timeout);
            unit.aggregator.ws.unsubscribe(address, 'FUTURES');
            resolve(liquidationOrder.id);
          }
        }
      })

      timeout = setTimeout(() => {
        unit.aggregator.ws.unsubscribe(address, 'FUTURES');

        reject(new Error(`${instrumentName}: Liquidation order timeout`));
      }
      , 20 * 60 * 1000); // 20 minutes
    })
  }

  const waitUntilPositionZeroed = (address: string, instrument: string) => {
    let timeout: ReturnType<typeof setTimeout>;

    return new Promise<void>((resolve, reject) => {
      unit.aggregator.ws.subscribe('ausf', {
        payload: address,
        callback: data => {
          const position = data.balance?.statesByInstruments.find(p => p.instrument === instrument);
          if (position && parseFloat(position.position) === 0) {
            clearTimeout(timeout);
            unit.aggregator.ws.unsubscribe(address, 'FUTURES');

            resolve();
          }
        }
      })
      timeout = setTimeout(() => {
        unit.aggregator.ws.unsubscribe(address, 'FUTURES');
        reject(new Error(`${instrumentName}: Timeout waiting for position zeroed`));
      }, 30000);
    })
  }

  const waitDeposit = (address: string) => {
    let timeout: ReturnType<typeof setTimeout>;

    return new Promise<void>((resolve, reject) => {
      unit.aggregator.ws.subscribe('ausf', {
        payload: address,
        callback: data => {
          if (data.balance) {
            console.log(`${instrumentName}: Free margin USD: ${data.balance.freeMarginUSD}`);
            // const balanceIsReady = new BigNumber(data.balance.balance).isGreaterThanOrEqualTo(amount);
            const balanceIsReady = new BigNumber(data.balance.freeMarginUSD).isGreaterThan(0);

            if (balanceIsReady) {
              clearTimeout(timeout);
              unit.aggregator.ws.unsubscribe(address, 'FUTURES');
              resolve();
            }
          }
        }
      })
      timeout = setTimeout(() => {
        unit.aggregator.ws.unsubscribe(address, 'FUTURES');
        reject(new Error(`${instrumentName}: Deposit timeout`));
      }, 30000);
    })
  }

  const { address } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
  if (address === undefined) throw new TypeError('address is undefined');

  // Prerequisites:
  // 1. Wallet with USDT

  // Defining wallet
  const wallet = new ethers.Wallet(
    PRIVATE_KEY,
    unit.provider
  );
  const walletAddress = (await wallet.getAddress()).toLowerCase();
  console.log(`Wallet address: ${walletAddress}`);

  const crossMarginCFDContract = CrossMarginCFD__factory.connect(address, wallet);
  const collateralAddress = await crossMarginCFDContract.collateral();

  const collateralContract = ERC20__factory.connect(collateralAddress, wallet);
  const decimals = await collateralContract.decimals();
  const allowance = await collateralContract.allowance(walletAddress, address);

  const bnAmount = ethers.utils.parseUnits(DEPOSIT_AMOUNT, decimals);
  if (allowance.lt(bnAmount)) {
    console.log(`${instrumentName}: Approving ${DEPOSIT_AMOUNT} ${collateralAddress} to ${address}`);
    await collateralContract.approve(address, ethers.constants.MaxUint256); // Sometimes before approve you need to call approve(0)
  }

  // 2. Make deposit to Cross CFD contract
  console.log(`${instrumentName}: Depositing ${DEPOSIT_AMOUNT} ${collateralAddress} to ${address}`);
  await crossMarginCFDContract.depositAsset(bnAmount);
  console.log(`${instrumentName}: Waiting for deposit...`);
  await waitDeposit(walletAddress);
  console.log(`${instrumentName}: Deposit done`);

  const { instruments, oracleAddress } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
  if (oracleAddress === undefined) throw new TypeError('oracleAddress is undefined');
  const instrumentInfo = instruments[instrumentName];
  if (!instrumentInfo) throw new Error(`${instrumentName}: Instrument info not found`);

  const { networkFeeInFeeAsset } = await unit.calculateFee(instrumentName, '0', 'cross');

  const futuresInfo = await getFuturesInfo(
    walletAddress,
    instrumentName,
    amnt,
    instrumentInfo.feePercent / 100,
    parseFloat(networkFeeInFeeAsset),
  );
  const { buyPower, buyPrice, sellPower, sellPrice } = futuresInfo;
  console.log(`
  FTS. INPUT: ${JSON.stringify({
    s: walletAddress,
    i: instrumentName,
    a: amnt,
    sl: SLIPPAGE_PERCENT / 100,
    l: LEVERAGE,
    F: instrumentInfo.feePercent / 100,
    f: networkFeeInFeeAsset
  })}
  FTS. OUTPUT: ${JSON.stringify(futuresInfo, null, 2)}
  `)
  const priceChange24h = await getPriceChange24h(instrumentName);
  console.log(`${instrumentName}: Price change 24h: ${priceChange24h > 0 ? '+' : ''}${priceChange24h}%`);

  const { pricePrecision, qtyPrecision } = await simpleFetch(unit.aggregator.getPairConfig)(instrumentName);

  // First order params
  const side: 'BUY' | 'SELL' = priceChange24h < 0 ? 'BUY' : 'SELL';
  const amount = side === 'BUY'
    ? new BigNumber(buyPower).decimalPlaces(qtyPrecision).toNumber()
    : new BigNumber(sellPower).decimalPlaces(qtyPrecision).toNumber();

  if (amount === 0) throw new Error(`${instrumentName}: Order amount is zero. Buy power: ${buyPower}, sell power: ${sellPower}`);

  const price = side === 'BUY' ? buyPrice : sellPrice;
  if (price === undefined) throw new TypeError(`${instrumentName}: Price is undefined. Expected number. Side: ${side}`);

  const priceWIthSlippage = side === 'BUY'
    ? new BigNumber(price).multipliedBy(1 + SLIPPAGE_PERCENT / 100).decimalPlaces(pricePrecision).toNumber()
    : new BigNumber(price).multipliedBy(1 - SLIPPAGE_PERCENT / 100).decimalPlaces(pricePrecision).toNumber();

  console.log(`${instrumentName}: Original price: ${price}, price with slippage: ${priceWIthSlippage}`);

  const { totalFee } = await unit.calculateFee(instrumentName, amount, 'cross');
  console.log(`${instrumentName}: Open position order: ${side} ${amount} at price ${priceWIthSlippage} with fee ${totalFee.toString()}`);

  // Signing order
  const signedOrder = await crypt.signCrossMarginCFDOrder(
    instrumentInfo.id, // instrumentIndex
    side, // side: 'BUY' | 'SELL'
    priceWIthSlippage,
    amount,
    totalFee,
    walletAddress,
    oracleAddress,
    false, // usePersonalSign
    wallet, // pass here ethers.Signer instance
    unit.chainId,
    stopPrice,
    false // isFromDelegate — if true, then the order will be placed on behalf of the delegate
  );

  // 3. Make order: open position
  const { orderId } = await simpleFetch(unit.aggregator.placeCrossMarginOrder)(signedOrder);
  console.log(`${instrumentName}: Order ${orderId} placed. Waiting for settlement...`);

  // 4. Wait order until Settled status. Timeout 30 seconds.
  await waitOrderSettlement(walletAddress, orderId);
  console.log(`${instrumentName}: Order ${orderId} settled. Waiting for position open...`);

  await delay(2000);

  // 5. Wait open position. Timeout 30 seconds.
  // 6. Take current margin level.
  const [positionML, commonML] = await waitPositionOpen(walletAddress, instrumentName);
  console.log(`${instrumentName}: Position opened. ML: ${commonML}, PML: ${positionML}`);

  // Rest part test async

  void (async () => {
    await delay(1000);

    // 7. Wait liquidation order. Timeout 300 seconds.
    console.log(`${instrumentName}: Waiting for liquidation order...`);
    const liquidationOrderId = await waitLiquidationOrder(walletAddress, instrumentName);
    console.log(`${instrumentName}: Liquidation order ${liquidationOrderId} created. Waiting for settlement...`);

    await delay(1000);

    // 8. Wait liquidation order until Settled status. Timeout 30 seconds.
    await waitOrderSettlement(walletAddress, liquidationOrderId);
    console.log(`${instrumentName}: Liquidation order ${liquidationOrderId} settled. Waiting for position zeroing...`);

    await delay(1000);

    // 9. Check that position by instrument is zeroed.
    await waitUntilPositionZeroed(walletAddress, instrumentName);
    console.log(`${instrumentName}: Position zeroed`);

    // close all connections
    unit.aggregator.ws.destroy();
  })();
}

// Chained launch of async tests

for (const { name, minAmount } of instrumentsToTest) {
  await testLiquidation(name, minAmount);
}

// process.exit(0);
