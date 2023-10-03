import { ethers } from 'ethers';
import type { CrossMarginCFDOrder } from '../types.js';

const signCrossMarginCFDOrderPersonal = async (order: CrossMarginCFDOrder, signer: ethers.Signer) => {
  const message = ethers.solidityPackedKeccak256(
    [
      'string', 'address', 'address', 'uint16', 'uint96', 'uint80', 'uint64', 'uint64', 'uint8',
    ],
    [
      'order',
      order.senderAddress,
      order.matcherAddress,
      order.instrumentIndex,
      order.amount,
      order.price,
      order.matcherFee,
      order.expiration,
      order.buySide,
    ],
  );
  const signature = await signer.signMessage(ethers.getBytes(message));

  // NOTE: metamask broke sig.v value and we fix it in next line
  return ethers.Signature.from(signature).serialized;
};

export default signCrossMarginCFDOrderPersonal;
