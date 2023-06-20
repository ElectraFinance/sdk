import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { BigNumber } from 'bignumber.js';
import type { ethers } from 'ethers';
import { joinSignature, splitSignature } from 'ethers/lib/utils.js';
import { INTERNAL_PROTOCOL_PRECISION } from '../constants/index.js';
import type { CrossMarginCFDOrder, SignedCrossMarginCFDOrder, SupportedChainId } from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
import { CROSS_MARGIN_CFD_ORDER_TYPES } from '../constants/cfdOrderTypes.js';
import signCrossMarginCFDOrderPersonal from './signCrossMarginCFDOrderPersonal.js';
import hashCrossMarginCFDOrder from './hashCrossMarginCFDOrder.js';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

type SignerWithTypedDataSign = ethers.Signer & TypedDataSigner;

export const signCrossMarginCFDOrder = async (
  instrumentIndex: number,
  side: 'BUY' | 'SELL',
  price: BigNumber.Value,
  amount: BigNumber.Value,
  matcherFee: BigNumber.Value,
  senderAddress: string,
  matcherAddress: string,
  usePersonalSign: boolean,
  signer: ethers.Signer,
  chainId: SupportedChainId,
  stopPrice: BigNumber.Value | undefined,
  isFromDelegate?: boolean,
) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;

  const order: CrossMarginCFDOrder = {
    senderAddress,
    matcherAddress,
    instrumentIndex,
    amount: normalizeNumber(
      amount,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    ).toNumber(),
    price: normalizeNumber(
      price,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    ).toNumber(),
    matcherFee: normalizeNumber(
      matcherFee,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_CEIL, // ROUND_CEIL because we don't want get "not enough fee" error
    ).toNumber(),
    expiration,
    buySide: side === 'BUY' ? 1 : 0,
    stopPrice: stopPrice !== undefined
      ? new BigNumber(stopPrice).toNumber()
      : undefined,
    isPersonalSign: usePersonalSign,
    isFromDelegate,
  };

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const typedDataSigner = signer as SignerWithTypedDataSign;
  const signature = usePersonalSign
    ? await signCrossMarginCFDOrderPersonal(order, signer)
    : await typedDataSigner._signTypedData(
      getDomainData(chainId),
      CROSS_MARGIN_CFD_ORDER_TYPES,
      order,
    );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = joinSignature(splitSignature(signature));

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedCrossMarginCFDOrder = {
    ...order,
    id: hashCrossMarginCFDOrder(order),
    signature: fixedSignature,
  };

  return signedOrder;
};

export default signCrossMarginCFDOrder;