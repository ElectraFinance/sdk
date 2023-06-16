<!-- Insert logo -->

<div align="center">
    <img 
        src="./logo.svg"
        width="300"
        alt="Electra Finance SDK logo"
     />
    <h1>Electra finance SDK</h1>
</div>

[![npm version](https://img.shields.io/npm/v/@electra.finance/sdk.svg)](https://www.npmjs.com/package/@electra.finance/sdk)
![npm bundle size (version)](https://img.shields.io/bundlephobia/minzip/@electra.finance/sdk)
[![Downloads](https://img.shields.io/npm/dm/@electra.finance/sdk.svg)](https://www.npmjs.com/package/@electra.finance/sdk)

## Overview

Electra Software Developer Kit is a futures trading library for JavaScript and TypeScript. It provides a set of tools for building trading bots, price feeds, and other applications on top of Electra Finance.

## API Key

Electra’s SDK is free to use and does not require an API key or registration. Refer to integration examples for more detailed information.

- [Overview](#overview)
- [API Key](#api-key)
- [Install](#install)
- [Usage](#usage)
- [Initialization](#initialization)
- [Crosschain methods](#crosschain-methods)
  - [Get pairs](#get-pairs)
- [Chain-specific methods](#chain-specific-methods)
  - [Deposit and withdraw](#deposit-and-withdraw)
  - [Get aggregated orderbook](#get-aggregated-orderbook)
  - [Get historical price](#get-historical-price)
  - [Get tradable pairs](#get-tradable-pairs)
  - [Get deposits and withdrawals](#get-deposits-and-withdrawals)
  - [Get available contracts](#get-available-contracts)
  - [Place order](#place-order)
  - [Aggregator WebSocket](#aggregator-websocket)
  - [Balances and order history stream](#balances-and-order-history-stream)
  - [Orderbook stream](#orderbook-stream)
  - [Aggregator WS Stream Unsubscribing](#aggregator-ws-stream-unsubscribing)
- [Price Feed Websocket Stream](#price-feed-websocket-stream)
- [Data fetching](#data-fetching)
- [Using contracts](#using-contracts)

## Install

```console
npm i @electra.finance/sdk
```

## Usage

## Initialization

> :warning: **Ethers ^5.6.0 required**

```js
// Node.js
import { Unit, Electra } from "@electra.finance/sdk";
import { Wallet } from "ethers";

const electra = new Electra();
const unit = electra.getUnit("bsc"); // eth, bsc, ftm, polygon, okc available
const wallet = new Wallet("0x...", unit.provider);
// Unit is chain-in-environment abstraction
```

```ts
// Metamask
import { Unit } from "@electra.finance/sdk";
import detectEthereumProvider from "@metamask/detect-provider";
import { BaseProvider } from "@metamask/providers";
import { providers } from "ethers";

const startApp = async (provider: BaseProvider) => {
  const web3Provider = new providers.Web3Provider(provider);
  await web3Provider.ready;
  const signer = web3Provider.getSigner(); // ready to go
  const electra = new Electra();
  const unit = electra.getUnit("eth"); // ready to go
};

detectEthereumProvider().then((provider) => {
  if (provider) {
    startApp(provider as BaseProvider);
  } else {
    console.log("Please install MetaMask!");
  }
});
```

## Crosschain methods

### Get pairs

```ts
const pairs = await electra.getPairs("futures"); // 'futures'

// Response example:
// {
//   'BTCUSDF': [ '1', '56' ],
//   'ETHUSDF': [ '1', '56', '137' ],
// }
```

## Chain-specific methods

### Deposit and withdraw

To make deposits and withdrawals, you need to use package `@electra.finance/contracts`.

```ts
import { IsolatedMarginCFD__factory } from "@electra.finance/contracts";

const cfdContractAddress = "0x0000000000000000000000000000000000000000";
const cfdContract = IsolatedMarginCFD__factory.connect(cfdContractAddress, signer);

const deposit = await cfdContract.depositAsset("12423450000"); // Deposit
const withdraw = await cfdContract.withdrawAsset("12423450000"); // Withdraw

```

### Get aggregated orderbook

```ts
import { simpleFetch } from "simple-typed-fetch";

const orderbook = await simpleFetch(unit.aggregator.getAggregatedOrderbook)(
  "BTCUSDF",
  20 // Depth
);
```

### Get historical price

```ts
import { simpleFetch } from "simple-typed-fetch";

const candles = await simpleFetch(unit.priceFeed.getCandles)(
  "BTCUSDF",
  1650287678, // interval start, unix timestamp
  1650374078, // interval end, unix timestamp
  "5m" // '5m' or '30m' or '1h' or '1d',
);
```

### Get tradable pairs

```ts
import { simpleFetch } from "simple-typed-fetch";
const pairsList = await simpleFetch(unit.aggregator.getPairsList)("futures");
console.log(pairsList); // ['ETHUSDF, 'BTCUSDF']
```

### Get deposits and withdrawals

```ts
import { simpleFetch } from "simple-typed-fetch";
const depositsAndWithdrawals = await simpleFetch(unit.blockchainService.getCFDHistory)(
  "0x0000000000000000000000000000000000000000", // Some wallet address
);
console.log(depositsAndWithdrawals);

```

### Get available contracts

```ts
import { simpleFetch } from "simple-typed-fetch";
const contracts = await simpleFetch(unit.blockchainService.getCFDContracts)();
console.log(contracts);
```

### Place order

```ts
import { simpleFetch } from "simple-typed-fetch";
import { signCFDOrder, Electra } from "@electra.finance/sdk";
import { ethers } from 'ethers';

const walletPrivateKey = process.env['PRIVATE_KEY']
if (privateKey === undefined) throw new Error('Private key is required');

const electra = new Electra('testing');
const unit = electra.getUnit('bsc');

// Defining wallet
const wallet = new ethers.Wallet(
  walletPrivateKey,
  unit.provider
);

// Your order params
const senderAddress = await wallet.getAddress();
const amount = '23.12445313';
const symbol = 'ETHUSDF';
const side = 'BUY'
const price = '0.34543';
const stopPrice = '0.34'; // optional

// Getting additional params required for order signing
const contracts = await simpleFetch(unit.blockchainService.getCFDContracts)();
const contract = contracts.find((c) => c.name === symbol);
if (!contract) throw new Error(`Contract not found for symbol ${symbol}`);
const { totalFee } = await unit.calculateFee(symbol, amount);
const { matcherAddress } = await simpleFetch(unit.blockchainService.getInfo)();

// Signing order
const signedOrder = await signCFDOrder(
   contract.address, // instrumentAddress, you can retrieve list of available instruments from blockchainService.getCFDContracts()
   side, // side: 'BUY' | 'SELL'
   price,
   amount,
   totalFee,
   senderAddress,
   matcherAddress,
   false, // usePersonalSign
   wallet, // pass here ethers.Signer instance
   unit.chainId,
   stopPrice,
   false // isFromDelegate — if true, then the order will be placed on behalf of the delegate
);

// Placing order
const { orderId } =  = await simpleFetch(unit.aggregator.placeCFDOrder)(signedOrder);
console.log(`Order placed: ${orderId}`);

```

### Aggregator WebSocket

Available subscriptions:

```ts
CFD_ADDRESS_UPDATES_SUBSCRIBE = 'ausf', // Orders history, positions info, balances info
AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE = 'aobus', // Bids and asks
```

### Balances and order history stream

```ts
unit.aggregator.ws.subscribe(
  "ausf", // CFD_ADDRESS_UPDATES_SUBSCRIBE — orders, positions, balances
  {
    payload: "0x0000000000000000000000000000000000000000", // Some wallet address
    callback: (data) => {
      switch (data.kind) {
        case "initial":
          if (data.orders) console.log(data.orders); // All orders. "orders" is undefined if you don't have any orders yet
          // Orders is array of objects with the following structure:
          // {
          //  id: string                       // Order ID
          //  settledAmount: number            // Settled amount
          //  feeAsset: string                 // Fee asset
          //  fee: number                      // Fee
          //  status: "NEW" | "ACCEPTED" | "PARTIALLY_FILLED" | "FILLED" | "TX_PENDING" | "CANCELED" | "REJECTED" | "FAILED" | "SETTLED" | "NOT_FOUND" | "ROUTING"
          //  date: number                     // Creation time / unix timestamp
          //  clientOrdId: string              // sender (owner)
          //  type: "BUY" | "SELL"             // Order type
          //  pair: string                     // Pair
          //  amount: number                   // Amount
          //  price: number                    // Price
          //  stopPrice: number | undefined    // Stop price
          //  liquidated: boolean | undefined  // Is liquidated
          //  executionType: "LIMIT" | "STOP_LIMIT" | undefined
          //  triggerCondition: string | undefined
          //  realizedPnL: number | undefined
          //  subOrders: SubOrder[]
          // }
          if (data.balances) console.log(data.balances); // All balances
          // Balances is array of objects with the following structure:
          // {
          //  instrument: string,
          //  balance: string,       
          //  profitLoss: string,    
          //  fundingRate: string,   
          //  equity: string,       
          //  position: string,      
          //  currentPrice: string,  
          //  positionPrice: string, 
          //  reserves: string,      
          //  margin: string,        
          //  marginUSD: string,
          //  freeMarginUSD: string,
          //  availableWithdrawBalance: string,
          //  leverage: string,
          //  status: "SHORT" | "LONG" | "CLOSING" | "LIQUIDATION" | "ZERO"
          //  longFundingRatePerSecond: string,
          //  longFundingRatePerDay: string,
          //  shortFundingRatePerSecond: string,
          //  shortFundingRatePerDay: string,
          //  stopOutPrice: string | undefined,
          // }
          break;
        case "update": {
          if (data.order) console.log("Order update", data.order); // Since this is an update message, the "order" only contain the changed order
          // Data structure is similar to the structure of the "initial" message. See details: https://github.com/ElectraFinance/sdk/blob/main/src/services/Aggregator/ws/schemas/addressUpdateSchema.ts#L32
          if (data.balances) console.log("Balances update", data.balances); // Since this is an update message, the balances only contain the changed assets
          // Data structure is the same as in "initial" message
        }
      }
    },
  }
);

unit.aggregator.ws.unsubscribe("0x0000000000000000000000000000000000000000");
```

### Orderbook stream

```ts
unit.aggregator.ws.subscribe("aobus", {
  payload: "ETHUSDF", // Some trading pair
  callback: (asks, bids, pairName) => {
    console.log(`${pairName} orderbook asks`, asks);
    console.log(`${pairName} orderbook bids`, bids);
  },
});

unit.aggregator.ws.unsubscribe("ETHUSDF");
```

### Aggregator WS Stream Unsubscribing

```ts
// Asset pairs config updates unsubscribe
unit.aggregator.ws.unsubscribe("apcu");
```

## Price Feed Websocket Stream

```ts
const allTickersSubscription = unit.priceFeed.ws.subscribe("allTickers", {
  callback: (tickers) => {
    console.log(tickers);
  },
});
allTickersSubscription.unsubscribe();
unit.priceFeed.ws.unsubscribe("allTickers", allTickersSubscription.id); // Also you can unsubscribe like this

const tickerSubscription = unit.priceFeed.ws.subscribe("ticker", {
  callback: (ticker) => {
    console.log(tricker);
  },
  payload: "ETHUSDF",
});
tickerSubscription.subscription();
unit.priceFeed.ws.unsubscribe("ticker", tickerSubscription.id);

const lastPriceSubscription = unit.priceFeed.ws.subscribe("lastPrice", {
  callback: ({ pair, price }) => {
    console.log(`Price: ${price}`);
  },
  payload: "ETHUSDF",
});
lastPriceSubscription.unsubscribe();
unit.priceFeed.ws.unsubscribe("lastPrice", lastPriceSubscription.id);
```

## Data fetching

```ts
// Verbose way example

const getCandlesResult = await unit.priceFeed.getCandles(
  "ETHUSDF",
  1650287678,
  1650374078,
  "5m"
);
if (getCandlesResult.isErr()) {
  // You can handle fetching errors here
  // You can access error text, statuses
  const { error } = placeOrderFetchResult;
  switch (error.type) {
    case "fetchError": // Instance of Error
      console.error(error.message);
      break;
    case "unknownFetchError":
      console.error(`URL: ${error.url}, Error: ${error.message}`);
      break;
    case "unknownFetchThrow":
      console.error("Something wrong happened during fetching", error.error);
      break;
    // ... more error types see in src/fetchWithValidation.ts
  }
} else {
  // Success result
  const { candles, timeStart, timeEnd } = getCandlesResult.value;
  // Here we can handle response data
}
```

```ts
// Simple Fetch

const { candles, timeStart, timeEnd } = await simpleFetch(
  unit.priceFeed.getCandles
)("ETHUSDF", 1650287678, 1650374078, "5m");

// Here we can handle response data
```

## Using contracts

Use package [@electra.finance/contracts](https://github.com/electra.finance/contracts)
