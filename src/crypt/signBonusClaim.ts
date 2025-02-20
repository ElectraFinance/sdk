import { ethers } from 'ethers';
import type { BonusClaim, BonusClaimRequest } from '../types.js';
import getDomainData from './getDomainData.js';
import BONUS_CLAIM_TYPES from '../constants/bonusClaimTypes.js';

const signBonusClaim = async (
  address: string,
  bonusId: string,
  signerChainId: number,
  signer: ethers.Signer,
) => {
  const bonusClaimRequest: BonusClaimRequest = {
    address,
    bonusId,
    chainId: signerChainId,
  };

  const signature = await signer.signTypedData(
    getDomainData(signerChainId),
    BONUS_CLAIM_TYPES,
    bonusClaimRequest
  );

  const fixedSignature = ethers.Signature.from(signature).serialized;

  const signedBonusClaimReqeust: BonusClaim = {
    ...bonusClaimRequest,
    signature: fixedSignature,
  };
  return signedBonusClaimReqeust;
};

export default signBonusClaim;
