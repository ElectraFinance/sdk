import { ethers } from 'ethers';
import type { BonusClaimRequest } from '../types.js';

const signBonusClaimPersonal = async (
  bonusClaimRequest: BonusClaimRequest,
  signer: ethers.Signer,
) => {
  const types = [
    'string',
    'address',
    'uint16',
    'uint8',
    'uint64',
    'uint64',
  ];
  const message = ethers.solidityPackedKeccak256(
    types,
    [
      'CFDClaimBonusRequest',
      bonusClaimRequest.address,
      bonusClaimRequest.bonusId,
    ],
  );
  const signature = await signer.signMessage(ethers.getBytes(message));

  return ethers.Signature.from(signature).serialized;
};

export default signBonusClaimPersonal;
