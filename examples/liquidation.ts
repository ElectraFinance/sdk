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

// const MARGIN_LEVEL_THRESHOLD = 80;

const getFuturesInfo = (walletAddress: string, instrument: string, amount: number) => {
  return new Promise<FuturesTradeInfo>((resolve, reject) => {
    const subId = unit.aggregator.ws.subscribe('fts', {
      payload: {
        s: walletAddress,
        i: instrument,
        a: amount
      },
      callback: data => {
        unit.aggregator.ws.unsubscribe(subId);
        unit.aggregator.ws.destroy();
        resolve(data);
      }
    })
    setTimeout(() => {
      unit.aggregator.ws.unsubscribe(subId);
      unit.aggregator.ws.destroy();

      reject(new Error('Futures info timeout'));
    }, 10000);
  })
}

const getPriceChange24h = (s: string) => {
  return new Promise<number>((resolve, reject) => {
    const { unsubscribe } = unit.priceFeed.ws.subscribe('ticker', {
      payload: s,
      callback: ({ openPrice, lastPrice }) => {
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
    setTimeout(() => {
      unsubscribe();
      reject(new Error(`Price feed timeout for ${s}`));
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
  return new Promise<void>((resolve, reject) => {
    const subId = unit.aggregator.ws.subscribe('ausf', {
      payload: address,
      callback: data => {
        if (data.kind === 'initial') {
          const order = data.orders?.find(o => o.id === orderId);
          if (order?.status === 'SETTLED') {
            unit.aggregator.ws.unsubscribe(subId);
            unit.aggregator.ws.destroy();
            resolve();
          } else if (order?.status === 'FAILED') {
            unit.aggregator.ws.unsubscribe(subId);
            unit.aggregator.ws.destroy();
            reject(new Error('Order failed'));
          }
        } else {
          if (data.order && data.order.id === orderId && data.order.status === 'SETTLED') {
            unit.aggregator.ws.unsubscribe(subId);
            unit.aggregator.ws.destroy();
            resolve();
          } else if (data.order && data.order.id === orderId && data.order.status === 'FAILED') {
            unit.aggregator.ws.unsubscribe(subId);
            unit.aggregator.ws.destroy();
            reject(new Error('Order failed'));
          }
        }
      }
    })
    setTimeout(() => {
      unit.aggregator.ws.destroy();
      reject(new Error('Order settlement timeout'));
    }, 30000);
  })
}

// Returns margin level
const waitPositionOpen = (address: string, instrument: string) => {
  return new Promise<number>((resolve, reject) => {
    const subId = unit.aggregator.ws.subscribe('ausf', {
      payload: address,
      callback: data => {
        const { balance } = data;
        if (balance) {
          const position = balance.statesByInstruments.find((s) => s.instrument === instrument);
          if (position && parseFloat(position.position) !== 0) {
            const marginLevel = new BigNumber(balance.equity)
              .div(position.marginUSD)
              .multipliedBy(100)
              .toNumber();

            unit.aggregator.ws.unsubscribe(subId);
            unit.aggregator.ws.destroy();
            resolve(marginLevel);
          }
        }
      }
    })
    setTimeout(() => {
      unit.aggregator.ws.unsubscribe(subId);
      unit.aggregator.ws.destroy();

      reject(new Error('Position open timeout'));
    }, 30000);
  })
}

const waitLiquidationOrder = (address: string, instrument: string) => {
  let orders: Array<z.infer<typeof fullOrderSchema>> = [];

  return new Promise<string>((resolve, reject) => {
    const subId = unit.aggregator.ws.subscribe('ausf', {
      payload: address,
      callback: data => {
        if (data.kind === 'initial') {
          orders = data.orders ?? [];
        } else {
          const { order } = data;
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

        const liquidationOrder = orders.find(o => o.instrument === instrument && o.liquidated);
        if (liquidationOrder) {
          unit.aggregator.ws.unsubscribe(subId);
          unit.aggregator.ws.destroy();
          resolve(liquidationOrder.id);
        }
      }
    })

    setTimeout(() => {
      unit.aggregator.ws.unsubscribe(subId);
      unit.aggregator.ws.destroy();

      reject(new Error('Liquidation order timeout'));
    }
    , 5 * 60 * 1000); // 5 minutes
  })
}

const waitUntilPositionZeroed = (address: string, instrument: string) => {
  return new Promise<void>((resolve, reject) => {
    const subId = unit.aggregator.ws.subscribe('ausf', {
      payload: address,
      callback: data => {
        const position = data.balance?.statesByInstruments.find(p => p.instrument === instrument);
        if (position && parseFloat(position.position) === 0) {
          unit.aggregator.ws.unsubscribe(subId);
          unit.aggregator.ws.destroy();
          resolve();
        }
      }
    })
    setTimeout(() => {
      unit.aggregator.ws.destroy();
      reject(new Error('Timeout'));
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
const walletAddress = await wallet.getAddress();
console.log(`Wallet address: ${walletAddress}`);

const crossMarginCFDContract = CrossMarginCFD__factory.connect(address, wallet);
const collateralAddress = await crossMarginCFDContract.collateral();

const collateralContract = ERC20__factory.connect(collateralAddress, wallet);
const decimals = await collateralContract.decimals();
const allowance = await collateralContract.allowance(walletAddress, address);

const SLIPPAGE_PERCENT = 5;
const DEPOSIT_AMOUNT = '20';
const instrument = 'BTCUSDF';
const stopPrice = undefined; // optional

const bnAmount = ethers.utils.parseUnits(DEPOSIT_AMOUNT, decimals);
if (allowance.lt(bnAmount)) {
  await collateralContract.approve(address, ethers.constants.MaxUint256); // Sometimes before approve you need to call approve(0)
}

// 2. Make deposit to Cross CFD contract
// await crossMarginCFDContract.depositAsset(bnAmount);

const { instruments } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
const instrumentInfo = instruments[instrument];
if (!instrumentInfo) throw new Error(`Instrument not found for symbol ${instrument}`);

const { buyPower, buyPrice, sellPower, sellPrice } = await getFuturesInfo(walletAddress, instrument, 0.1);
const priceChange24h = await getPriceChange24h(instrument);
console.log(`Price change 24h: ${priceChange24h > 0 ? '+' : ''}${priceChange24h}%`);

const { pricePrecision, qtyPrecision } = await simpleFetch(unit.aggregator.getPairConfig)(instrument);

// First order params
const side: 'BUY' | 'SELL' = priceChange24h < 0 ? 'BUY' : 'SELL';
const amount = side === 'BUY'
  ? new BigNumber(buyPower).decimalPlaces(qtyPrecision).toNumber()
  : new BigNumber(sellPower).decimalPlaces(qtyPrecision).toNumber();

if (amount === 0) throw new Error(`Order amount is zero. Buy power: ${buyPower}, sell power: ${sellPower}`);

const price = side === 'BUY' ? buyPrice : sellPrice;
if (price === undefined) throw new TypeError(`Price is undefined. Expected number. Side: ${side}`);

const priceWIthSlippage = side === 'BUY'
  ? new BigNumber(price).multipliedBy(1 + SLIPPAGE_PERCENT / 100).decimalPlaces(pricePrecision).toNumber()
  : new BigNumber(price).multipliedBy(1 - SLIPPAGE_PERCENT / 100).decimalPlaces(pricePrecision).toNumber();

console.log(`Original price: ${price}, price with slippage: ${priceWIthSlippage}`);

const { totalFee } = await unit.calculateFee(instrument, amount, 'cross');
console.log(`Open position order: ${side} ${amount} ${instrument} at price ${priceWIthSlippage} with fee ${totalFee.toString()}`);
const { matcherAddress } = await simpleFetch(unit.blockchainService.getInfo)();

// Signing order
const signedOrder = await crypt.signCrossMarginCFDOrder(
  instrumentInfo.id, // instrumentIndex
  side, // side: 'BUY' | 'SELL'
  priceWIthSlippage,
  amount,
  totalFee,
  walletAddress,
  matcherAddress,
  false, // usePersonalSign
  wallet, // pass here ethers.Signer instance
  unit.chainId,
  stopPrice,
  false // isFromDelegate — if true, then the order will be placed on behalf of the delegate
);

// 3. Make order: open position
const { orderId } = await simpleFetch(unit.aggregator.placeCrossMarginOrder)(signedOrder);
console.log(`Order ${orderId} placed. Waiting for settlement...`);

// 4. Wait order until Settled status. Timeout 30 seconds.
await waitOrderSettlement(walletAddress, orderId);
console.log(`Order ${orderId} settled. Waiting for position open...`);

// 5. Wait open position. Timeout 30 seconds.
// 6. Take current margin level.
const marginLevel = await waitPositionOpen(walletAddress, instrument);
console.log(`Position by instrument ${instrument} opened. Margin level: ${marginLevel}`);

// 7. Wait liquidation order. Timeout 300 seconds.
console.log('Waiting for liquidation order...');
const liquidationOrderId = await waitLiquidationOrder(walletAddress, instrument);
console.log(`Liquidation order ${liquidationOrderId} created. Waiting for settlement...`);

// 8. Wait liquidation order until Settled status. Timeout 30 seconds.
await waitOrderSettlement(walletAddress, liquidationOrderId);
console.log(`Liquidation order ${liquidationOrderId} settled. Waiting for position zeroing...`);

// 9. Check that position by instrument is zeroed.
await waitUntilPositionZeroed(walletAddress, instrument);
console.log(`Position by instrument ${instrument} zeroed`);
