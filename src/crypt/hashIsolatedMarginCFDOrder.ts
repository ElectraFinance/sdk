import { ethers } from 'ethers';
import type { IsolatedCFDOrder } from '../types.js';

const hashIsolatedMarginCFDOrder = (order: IsolatedCFDOrder) => ethers.solidityPackedKeccak256(
  [
    'uint8',
    'address',
    'address',
    'address',
    'uint64',
    'uint64',
    'uint64',
    'uint64',
    'uint64',
    'uint8',
  ],
  [
    '0x03',
    order.senderAddress,
    order.matcherAddress,
    order.instrumentAddress,
    order.amount,
    order.price,
    order.matcherFee,
    order.nonce,
    order.expiration,
    order.buySide === 1 ? '0x01' : '0x00',
  ],
);

export default hashIsolatedMarginCFDOrder;
