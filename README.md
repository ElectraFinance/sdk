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
- [High level methods](#high-level-methods)
  - [Get pairs](#get-pairs)
- [Low level methods](#low-level-methods)
  - [Get aggregated orderbook](#get-aggregated-orderbook)
  - [Get historical price](#get-historical-price)
  - [Get tradable pairs](#get-tradable-pairs)
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

## High level methods

### Get pairs

```ts
const pairs = await electra.getPairs("futures"); // 'futures'

// Response example:
// {
//   'BTCUSDF': [ '1', '56' ],
//   'ETHUSDF': [ '1', '56', '137' ],
// }
```

## Low level methods

### Get aggregated orderbook

```ts
import { simpleFetch } from "@electra.finance/sdk";

const orderbook = await simpleFetch(unit.aggregator.getAggregatedOrderbook)(
  "BTCUSDF",
  20 // Depth
);
```

### Get historical price

```ts
import { simpleFetch } from "@electra.finance/sdk";

const candles = await simpleFetch(unit.priceFeed.getCandles)(
  "BTCUSDF",
  1650287678, // interval start, unix timestamp
  1650374078, // interval end, unix timestamp
  "5m" // '5m' or '30m' or '1h' or '1d',
);
```

### Get tradable pairs

```ts
import { simpleFetch } from "@electra.finance/sdk";
const pairsList = await simpleFetch(unit.aggregator.getPairsList)("futures");
console.log(pairsList); // ['ETHUSDF, 'BTCUSDF']
```

### Aggregator WebSocket

Available subscriptions:

```ts
ADDRESS_UPDATES_SUBSCRIBE = 'aus', // Orders history, balances info
AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE = 'aobus', // Bids and asks
ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE = 'apcus',
```

### Balances and order history stream

```ts
unit.aggregator.ws.subscribe(
  "aus", // ADDRESS_UPDATES_SUBSCRIBE — orders, balances
  {
    payload: "0x0000000000000000000000000000000000000000", // Some wallet address
    callback: (data) => {
      switch (data.kind) {
        case "initial":
          if (data.orders) console.log(data.orders); // All orders. "orders" is undefined if you don't have any orders yet
          console.log(data.balances); // Since this is initial message, the balances contain all assets
          break;
        case "update": {
          if (data.order) {
            switch (data.order.kind) {
              case "full":
                console.log("Pool order", data.order); // Orders from the pool go into history with the SETTLED status
                break;
              case "update":
                console.log("Order in the process of execution", data.order);
                break;
              default:
                break;
            }
          }
          if (data.balances) console.log("Balance update", data.balances); // Since this is an update message, the balances only contain the changed assets
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
