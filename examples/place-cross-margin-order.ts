import {Electra, SupportedChainId, crypt} from "../src/index";
import {ethers} from "ethers";
import {simpleFetch} from "simple-typed-fetch";

const walletPrivateKey = "";

const electra = new Electra({
    marginMode: 'cross',
    referralAPI: '',
    networks: {
        97: {
            chainId: SupportedChainId.BSC_TESTNET,
            nodeJsonRpc: "https://test.electra.finance/bsc-testnet/rpc",
            services: {
                blockchainService: {
                    http: "https://test.electra.finance/bsc-testnet",
                },
                aggregator: {
                    http: "https://test.electra.finance/bsc-testnet/backend",
                    ws: "https://test.electra.finance/bsc-testnet/v1",
                },
                priceFeed: {
                    api: "https://test.electra.finance/bsc-testnet2/price-feed",
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

// Your order params
const senderAddress = await wallet.getAddress();
const amount = '23.124';
const symbol = 'ETHUSDF';
const side = 'BUY'
const price = '40.86';
const stopPrice = '0.34'; // optional

// Getting additional params required for order signing
const { instruments } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
const instrumentInfo = instruments[symbol];
if (!instrumentInfo) throw new Error(`Instrument not found for symbol ${symbol}`);
const {totalFee} = await unit.calculateFee(symbol, amount);
const {matcherAddress} = await simpleFetch(unit.blockchainService.getInfo)();

// Signing order
const signedOrder = await crypt.signCrossMarginCFDOrder(
    instrumentInfo.id, // instrumentIndex
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
const {orderId} = await simpleFetch(unit.aggregator.placeCrossMarginOrder)(signedOrder);
console.log(`Order placed: ${orderId}`);