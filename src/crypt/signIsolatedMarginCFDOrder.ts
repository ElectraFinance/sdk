import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import {
  DEFAULT_EXPIRATION,
  INTERNAL_PROTOCOL_PRECISION,
} from '../constants/index.js';
import type {
  IsolatedCFDOrder,
  SignedIsolatedMarginCFDOrder,
} from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
import signIsolatedMarginCFDOrderPersonal from './signIsolatedMarginCFDOrderPersonal.js';
import hashIsolatedMarginCFDOrder from './hashIsolatedMarginCFDOrder.js';
import { ISOLATED_MARGIN_CFD_ORDER_TYPES } from '../constants/cfdOrderTypes.js';

export const signIsolatedMarginCFDOrder = async (
  instrumentAddress: string,
  side: 'BUY' | 'SELL',
  price: BigNumber.Value,
  amount: BigNumber.Value,
  matcherFee: BigNumber.Value,
  senderAddress: string,
  matcherAddress: string,
  usePersonalSign: boolean,
  signer: ethers.Signer,
  chainId: number,
  stopPrice: BigNumber.Value | undefined,
  isFromDelegate?: boolean
) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;

  const order: IsolatedCFDOrder = {
    senderAddress,
    matcherAddress,
    instrumentAddress,
    price2: 0,
    orderType: 0,
    signerChainId: chainId,
    amount: Number(
      normalizeNumber(
        amount,
        INTERNAL_PROTOCOL_PRECISION,
        BigNumber.ROUND_FLOOR
      )
    ),
    price: Number(
      normalizeNumber(price, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR)
    ),
    matcherFee: Number(
      normalizeNumber(
        matcherFee,
        INTERNAL_PROTOCOL_PRECISION,
        BigNumber.ROUND_CEIL // ROUND_CEIL because we don't want get "not enough fee" error
      )
    ),
    nonce,
    expiration,
    buySide: side === 'BUY' ? 1 : 0,
    stopPrice:
      stopPrice !== undefined ? new BigNumber(stopPrice).toNumber() : undefined,
    isPersonalSign: usePersonalSign,
    isFromDelegate,
  };

  const signature = usePersonalSign
    ? await signIsolatedMarginCFDOrderPersonal(order, signer)
    : await signer.signTypedData(
        getDomainData(chainId),
        ISOLATED_MARGIN_CFD_ORDER_TYPES,
        order
      );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedIsolatedMarginCFDOrder = {
    ...order,
    id: hashIsolatedMarginCFDOrder(order),
    signature: fixedSignature,
  };

  return signedOrder;
};

export default signIsolatedMarginCFDOrder;
