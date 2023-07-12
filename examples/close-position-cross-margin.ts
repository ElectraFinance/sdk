import { Electra, SupportedChainId, crypt } from '../src/index.js';
import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';

const walletPrivateKey = '';

const electra = new Electra({
  marginMode: 'cross',
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
const symbol = 'ETHUSDF';

const counterOrder = await unit.makePositionCloseOrder(
  senderAddress,
  symbol,
  'cross'
)

// Signing order
const signedOrder = await crypt.signCrossMarginCFDOrder(
  counterOrder.instrumentIndex,
  counterOrder.side,
  counterOrder.price,
  counterOrder.amount,
  counterOrder.matcherFee,
  counterOrder.senderAddress,
  counterOrder.matcherAddress,
  counterOrder.isPersonalSign,
  wallet, // pass here ethers.Signer instance
  unit.chainId,
  undefined,
  false // isFromDelegate — if true, then the order will be placed on behalf of the delegate
);

// Close position by placing order
const { orderId } = await simpleFetch(unit.aggregator.placeCrossMarginOrder)(signedOrder);
console.log(`Order placed: ${orderId}`);
