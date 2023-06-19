
- [Crosschain methods](#crosschain-methods)
  - [Get pairs](#get-pairs)
- [Chain-specific methods](#chain-specific-methods)
  - [Get instruments info](#get-instruments-info)
  - [Deposit and withdraw](#deposit-and-withdraw)
  - [Place order](#place-order)

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

### Get instruments info

```ts
import { simpleFetch } from "simple-typed-fetch";
const instrumentsInfo = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
console.log(instrumentsInfo);
```

### Deposit and withdraw

To make deposits and withdrawals, you need to use package `@electra.finance/contracts`.

```ts
import { CrossMarginCFD__factory } from "@electra.finance/contracts";

const { address } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
const crossMarginCFDContract = CrossMarginCFD__factory.connect(address, signer);

const deposit = await crossMarginCFDContract.depositAsset("12423450000"); // Deposit
const withdraw = await crossMarginCFDContract.withdrawAsset("12423450000"); // Withdraw

```

### Place order

```ts
import { simpleFetch } from "simple-typed-fetch";
import { signCrossMarginCFDOrder, Electra } from "@electra.finance/sdk";
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
const { instruments } = await simpleFetch(unit.blockchainService.getCrossMarginInfo)();
const instrumentInfo = instruments[symbol];
if (!instrumentInfo) throw new Error(`Instrument ${symbol} not found`);
const { totalFee } = await unit.calculateFee(symbol, amount);
const { matcherAddress } = await simpleFetch(unit.blockchainService.getInfo)();

// Signing order
const signedOrder = await signCrossMarginCFDOrder(
   instrumentInfo.id,
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