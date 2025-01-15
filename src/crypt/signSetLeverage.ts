import { ethers } from 'ethers';
import type { Leverage, LeverageRequest } from '../types.js';
import getDomainData from './getDomainData.js';
import signSetLeveragePersonal from './signSetLeveragePersonal.js';
import { DEFAULT_EXPIRATION } from '../constants/index.js';
import SET_LEVERAGE_TYPES from '../constants/setLeverageTypes.js';

const signSetLeverage = async (
  senderAddress: string,
  instrumentIndex: number,
  signerChainId: number,
  leverage: string,
  signer: ethers.Signer,
  isFromDelegate: boolean,
  usePersonalSign?: boolean,
) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;

  const setLeverageRequest: LeverageRequest = {
    senderAddress,
    instrumentIndex,
    leverage,
    signerChainId,
    expiration,
    isFromDelegate,
  };

  const signature = usePersonalSign
    ? await signSetLeveragePersonal(setLeverageRequest, signer)
    : await signer.signTypedData(
        getDomainData(signerChainId),
        SET_LEVERAGE_TYPES,
        setLeverageRequest
      );

  const fixedSignature = ethers.Signature.from(signature).serialized;

  const signedSetLeverageReqeust: Leverage = {
    ...setLeverageRequest,
    signature: fixedSignature,
  };
  return signedSetLeverageReqeust;
};

export default signSetLeverage;
