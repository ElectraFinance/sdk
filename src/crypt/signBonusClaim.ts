import { ethers } from 'ethers';
import type { BonusClaim, BonusClaimRequest } from '../types.js';
import getDomainData from './getDomainData.js';
import signBonusClaimPersonal from './signBonusClaimPersonal.js';
import BONUS_CLAIM_TYPES from '../constants/bonusClaimTypes.js';

const signBonusClaim = async (
  address: string,
  bonusId: number,
  signerChainId: number,
  signer: ethers.Signer,
  usePersonalSign?: boolean,
) => {
  const bonusClaimRequest: BonusClaimRequest = {
    address,
    bonusId,
  };

  const signature = usePersonalSign === true
    ? await signBonusClaimPersonal(bonusClaimRequest, signer)
    : await signer.signTypedData(
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
