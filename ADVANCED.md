# Electra Verbose configuration

```ts
const electra = new Electra({
  networks: {
    1: {
      chainId: SupportedChainId.MAINNET,
      nodeJsonRpc: "https://cloudflare-eth.com/",
      services: {
        blockchainService: {
          http: "http://localhost:3000",
        },
        aggregator: {
          http: "http://localhost:3001/backend",
          ws: "http://localhost:3001/v1",
        },
        priceFeed: {
          api: "http://localhost:3002/price-feed",
        },
      },
    },
  },
});

// Also you can set some config as default and override it for some params
const electra = new Electra("testing", {
  networks: {
    [SupportedChainId.BSC_TESTNET]: {
      nodeJsonRpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    },
  },
});

// Electra unit init
const unit = electra.getUnit("bsc");
// OR
const unit = electra.getUnit(SupportedChainId.BSC);
// OR
const unit = new Unit({
  chainId: SupportedChainId.BSC,
  nodeJsonRpc: "https://bsc-dataseed.binance.org/",
  services: {
    blockchainService: {
      http: "https://electra-bsc-api.electra.finance",
    },
    aggregator: {
      http: "https://electra-bsc-api.electra.finance/backend",
      ws: "https://electra-bsc-api.electra.finance/v1",
    },
    priceFeed: {
      api: "https://electra-bsc-api.electra.finance/price-feed",
    },
  },
});
```
