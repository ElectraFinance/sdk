import { ethers } from 'ethers';
import type { IsolatedCFDOrder } from '../types.js';

const signIsolatedMarginCFDOrderPersonal = async (order: IsolatedCFDOrder, signer: ethers.Signer) => {
  const message = ethers.solidityPackedKeccak256(
    [
      'string', 'address', 'address', 'address', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64', 'uint8',
    ],
    [
      'order',
      order.senderAddress,
      order.matcherAddress,
      order.instrumentAddress,
      order.amount,
      order.price,
      order.matcherFee,
      order.nonce,
      order.expiration,
      order.buySide,
    ],
  );
  const signature = await signer.signMessage(ethers.getBytes(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return ethers.Signature.from(signature).serialized;
};

export default signIsolatedMarginCFDOrderPersonal;
