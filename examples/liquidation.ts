import {ethers} from "ethers";
import {simpleFetch} from "simple-typed-fetch";
import {CrossMarginCFD__factory, ERC20__factory} from "@electra.finance/contracts/lib/ethers-v5";

import { Electra, FuturesTradeInfo, SupportedChainId, crypt } from "../src";
import { BigNumber} from "bignumber.js";

const walletPrivateKey = "";

const hostURL = "https://test.electra.finance/bsc-testnet";

const electra = new Electra({
    marginMode: "cross",
    referralAPI: '',
    networks: {
        97: {
            chainId: SupportedChainId.BSC_TESTNET,
            nodeJsonRpc: hostURL + "/rpc",
            services: {
                blockchainService: {
                    http: hostURL,
                },
                aggregator: {
                    http: hostURL + "/backend",
                    ws: hostURL + "/v1",
                },
                priceFeed: {
                    api: hostURL + "/price-feed",
                },
            }
        },
    },
});

const unit = electra.getUnit(SupportedChainId.BSC_TESTNET);

const MARGIN_LEVEL_THRESHOLD = 80;

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
        setTimeout(() => reject(new Error('Timeout')), 10000);
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
        setTimeout(() => reject(new Error('Timeout')), 10000);
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
        const subId = unit.aggregator.ws.subscribe('aus', {
            payload: address,
            callback: data => {
                if(data.kind === 'initial'){
                    const order = data.orders?.find(o => o.id === orderId);
                    if(order?.status === 'SETTLED'){
                        unit.aggregator.ws.unsubscribe(subId);
                        unit.aggregator.ws.destroy();
                        resolve();
                    }
                } else {
                    if (data.order && data.order.id === orderId && data.order.status === 'SETTLED') {
                        unit.aggregator.ws.unsubscribe(subId);
                        unit.aggregator.ws.destroy();
                        resolve();
                    }
                }
            }
        })
        setTimeout(() => reject(new Error('Timeout')), 30000);
    })
}

// Returns margin level
const waitPositionOpen = (address: string, instrument: string) => {
    return new Promise<number>((resolve, reject) => {
        const subId = unit.aggregator.ws.subscribe('ausf', {
            payload: address,
            callback: data => {
                const position = data.balances?.find(p => p.instrument === instrument);
                if (position && parseFloat(position.position) !== 0){
                    const marginLevel = new BigNumber(position.equity).div(position.marginUSD).multipliedBy(100).toNumber();

                    unit.aggregator.ws.unsubscribe(subId);
                    unit.aggregator.ws.destroy();
                    resolve(marginLevel);
                }
            }
        })
        setTimeout(() => reject(new Error('Timeout')), 30000);
    })
}

const waitLiquidationOrder = (address: string, instrument: string) => {
    const check = () => {
        return new Promise<string | undefined>((resolve, reject) => {
            const subId = unit.aggregator.ws.subscribe('ausf', {
                payload: address,
                callback: data => {
                    if(data.kind === 'initial'){
                        const isLiquidationOrder= data.orders?.find(o => o.pair === instrument && o.liquidated);
                        if(isLiquidationOrder){
                            unit.aggregator.ws.unsubscribe(subId);
                            unit.aggregator.ws.destroy();
                            resolve(isLiquidationOrder.id);
                        } else {
                            resolve(undefined)
                        }
                    }
                }
            })
            setTimeout(() => reject(new Error('Timeout')), 5000);
        })
    }

    return new Promise<string>(async (resolve, reject) => {
        let orderId = await check();
        while(orderId === undefined){
            orderId = await check();
        }
        resolve(orderId);
        setTimeout(() => reject(new Error('Timeout')), 30000);
    })
}

const waitUntilPositionClosed = (address: string, instrument: string) => {
    return new Promise<void>((resolve, reject) => {
        const subId = unit.aggregator.ws.subscribe('ausf', {
            payload: address,
            callback: data => {
                const position = data.balances?.find(p => p.instrument === instrument);
                if (position && parseFloat(position.position) === 0){
                    unit.aggregator.ws.unsubscribe(subId);
                    unit.aggregator.ws.destroy();
                    resolve();
                }
            }
        })
        setTimeout(() => reject(new Error('Timeout')), 30000);
    })
}


const { address } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
if(address == undefined) throw new TypeError("address is undefined");


// Prerequisites:
// 1. Wallet with USDT

// Defining wallet
const wallet = new ethers.Wallet(
    walletPrivateKey,
    unit.provider
);
const walletAddress = await wallet.getAddress();

const crossMarginCFDContract = CrossMarginCFD__factory.connect(address, wallet);
const collateralAddress = await crossMarginCFDContract.collateral();

const collateralContract = ERC20__factory.connect(collateralAddress, wallet);
const decimals = await collateralContract.decimals();
const allowance = await collateralContract.allowance(walletAddress, address);

const DEPOSIT_AMOUNT = '20';
const instrument = 'BTCUSDF';
const stopPrice = undefined; // optional

const bnAmount = ethers.utils.parseUnits(DEPOSIT_AMOUNT, decimals);
if (allowance.lt(bnAmount)) {
    await collateralContract.approve(address, ethers.constants.MaxUint256); // Sometimes before approve you need to call approve(0)
}

// 2. Make deposit to Cross CFD contract
await crossMarginCFDContract.depositAsset(bnAmount);

const {instruments} = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
const instrumentInfo = instruments[instrument];
if (!instrumentInfo) throw new Error(`Instrument not found for symbol ${instrument}`);

const { buyPower, buyPrice, sellPower, sellPrice } = await getFuturesInfo(walletAddress, instrument, 0.1);
const priceChange24h = await getPriceChange24h(instrument);

// First order params
const side: 'BUY' | 'SELL' = priceChange24h < 0 ? 'BUY' : 'SELL';
const amount = side === 'BUY' ? buyPower : sellPower;
const price = side === 'BUY' ? buyPrice : sellPrice;
if (price == undefined) throw new TypeError(`Price is undefined. Expected number. Side: ${side}`);


const {totalFee} = await unit.calculateFee(instrument, amount, 'cross');
console.log(`Open position order: ${side} ${amount} ${instrument} at price ${price} with fee ${totalFee}`);
const {matcherAddress} = await simpleFetch(unit.blockchainService.getInfo)();

// Signing order
const signedOrder = await crypt.signCrossMarginCFDOrder(
    instrumentInfo.id, // instrumentIndex
    side, // side: 'BUY' | 'SELL'
    price,
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
const {orderId} = await simpleFetch(unit.aggregator.placeCrossMarginOrder)(signedOrder);
console.log(`Order ${orderId} placed`);

// 4. Wait order until Settled status. Timeout 30 seconds.
await waitOrderSettlement(walletAddress, orderId);
console.log(`Order ${orderId} settled`);

// 5. Wait open position. Timeout 30 seconds.
// 6. Take current margin level.
const marginLevel = await waitPositionOpen(walletAddress, instrument);
console.log(`Position by instrument ${instrument} opened. Margin level: ${marginLevel}`);

// 7. Wait liquidation order. Timeout 30 seconds.
const liquidationOrderId = await waitLiquidationOrder(walletAddress, instrument);

// 8. Wait liquidation order until Settled status. Timeout 30 seconds.
await waitOrderSettlement(walletAddress, liquidationOrderId);

// 9. Check that position by instrument is disappeared.
await waitUntilPositionClosed(walletAddress, instrument);