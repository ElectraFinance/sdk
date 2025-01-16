const SET_LEVERAGE_TYPES = {
  CFDUpdateLeverageRequest: [
    {name: "senderAddress", type: "address"},
    {name: "instrumentIndex", type: "uint16"},
    {name: "leverage", type: "uint8"},
    {name: "expiration", type: "uint64"},
    {name: "signerChainId", type: "uint64"}
  ],
};
  
export default SET_LEVERAGE_TYPES;
  