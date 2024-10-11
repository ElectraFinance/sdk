export const ISOLATED_MARGIN_CFD_ORDER_TYPES = {
  CFDOrder: [
    { name: 'senderAddress', type: 'address' },
    { name: 'matcherAddress', type: 'address' },
    { name: 'instrumentAddress', type: 'address' },
    { name: 'amount', type: 'uint64' },
    { name: 'price', type: 'uint64' },
    { name: 'matcherFee', type: 'uint64' },
    { name: 'nonce', type: 'uint64' },
    { name: 'expiration', type: 'uint64' },
    { name: 'buySide', type: 'uint8' },
  ],
};

export const CROSS_MARGIN_CFD_ORDER_TYPES = {
  CFDOrder: [
    { name: 'senderAddress', type: 'address' },
    { name: 'matcherAddress', type: 'address' },
    { name: 'instrumentIndex', type: 'uint16' },
    { name: 'amount', type: 'uint96' },
    { name: 'price', type: 'uint80' },
    { name: 'matcherFee', type: 'uint64' },
    { name: 'expiration', type: 'uint64' },
    { name: 'buySide', type: 'uint8' },
  ],
  CFDOrderV2: [
    { name: 'senderAddress', type: 'address' },
    { name: 'price', type: 'uint80' },
    { name: 'instrumentIndex', type: 'uint16' },
    { name: 'matcherAddress', type: 'address' },
    { name: 'price2', type: 'uint80' },
    { name: 'buySide', type: 'uint8' },
    { name: 'amount', type: 'uint96' },
    { name: 'matcherFee', type: 'uint64' },
    { name: 'expiration', type: 'uint64' },
    { name: 'orderType', type: 'uint8' },
    { name: 'signerChainId', type: 'uint64' },
  ],
};
