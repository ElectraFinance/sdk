import { ethers } from 'ethers';
import type { LeverageRequest } from '../types.js';

const signSetLeveragePersonal = async (
  leverageRequest: LeverageRequest,
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
      'CFDUpdateLeverageRequest',
      leverageRequest.senderAddress,
      leverageRequest.instrumentIndex,
      leverageRequest.leverage,
      leverageRequest.expiration,
      leverageRequest.signerChainId,
    ],
  );
  const signature = await signer.signMessage(ethers.getBytes(message));

  return ethers.Signature.from(signature).serialized;
};

export default signSetLeveragePersonal;
