import type { SignedCancelOrderRequest } from '../src/index.js';
import { Electra, SupportedChainId, crypt } from '../src/index.js';
import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';

const walletPrivateKey = '';

const electra = new Electra({
  marginMode: 'isolated',
  referralAPI: '',
  networks: {
    97: {
      chainId: SupportedChainId.BSC_TESTNET,
      nodeJsonRpc: 'https://test.electra.finance/bsc-testnet/rpc',
      services: {
        blockchainService: {
          http: 'https://test.electra.finance/bsc-testnet',
        },
        aggregator: {
          http: 'https://test.electra.finance/bsc-testnet/backend',
          ws: 'https://test.electra.finance/bsc-testnet/v1',
        },
        priceFeed: {
          api: 'https://test.electra.finance/bsc-testnet2/price-feed',
        },
      }
    },
  },
});

const unit = electra.getUnit(SupportedChainId.BSC_TESTNET);

// Defining wallet
const wallet = new ethers.Wallet(
  walletPrivateKey,
  unit.provider
);

const senderAddress = await wallet.getAddress();
const orderIdToCancel = '0x000000...'; // orderId of the order you want to cancel

const signedCancelOrderRequest: SignedCancelOrderRequest = await crypt.signCancelOrder(
  senderAddress, // senderAddress
  orderIdToCancel,
  false, // usePersonalSign
  wallet, // signer
  unit.chainId,
);

// Cancel order
const { orderId, remainingAmount } = await simpleFetch(unit.aggregator.cancelOrder)(signedCancelOrderRequest);
console.log(`Order ${orderId} canceled. Remaining amount: ${remainingAmount}`);
