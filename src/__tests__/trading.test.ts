import Electra from '../Electra/index.js';
import signCFDOrder from '../crypt/signIsolatedMarginCFDOrder.js';

import { simpleFetch } from 'simple-typed-fetch';
import { ethers } from 'ethers';

jest.setTimeout(10000);

const privateKey = process.env['PRIVATE_KEY']
if (privateKey === undefined) throw new Error('Private key is required');

describe('Electra Trading', () => {
  test('Place CFD order Electra testing', async () => {
    const electra = new Electra('testing');
    const unit = electra.getUnit('bsc');
    const wallet = new ethers.Wallet(
      privateKey,
      unit.provider
    );

    const senderAddress = await wallet.getAddress();
    const amount = '23.12445313';
    const symbol = 'ETHUSDF';
    const side = 'BUY'
    const price = '0.34543';
    const stopPrice = '0.34'; // optional

    const contracts = await simpleFetch(unit.blockchainService.getCFDContracts)();
    const contract = contracts.find((c) => c.name === symbol);
    if (!contract) throw new Error(`Contract not found for symbol ${symbol}`);

    const { totalFee } = await unit.calculateFee(symbol, amount);

    const {
      matcherAddress,
    } = await simpleFetch(unit.blockchainService.getInfo)();

    const signedOrder = await signCFDOrder(
      contract.address,
      side,
      price,
      amount,
      totalFee,
      senderAddress,
      matcherAddress,
      false,
      wallet,
      unit.chainId,
      stopPrice,
      false
    );

    const cfdOrder = await simpleFetch(unit.aggregator.placeCFDOrder)(signedOrder);
    console.log(cfdOrder);
  });
});
