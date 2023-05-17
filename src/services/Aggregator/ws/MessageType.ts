const MessageType = {
  ERROR: 'e',
  PING_PONG: 'pp',
  INITIALIZATION: 'i',
  AGGREGATED_ORDER_BOOK_UPDATE: 'aobu',
  ASSET_PAIRS_CONFIG_UPDATE: 'apcu',
  ASSET_PAIR_CONFIG_UPDATE: 'apiu',
  ADDRESS_UPDATE: 'au',
  CFD_ADDRESS_UPDATE: 'auf',
  FUTURES_TRADE_INFO_UPDATE: 'fti',
  UNSUBSCRIPTION_DONE: 'ud',
} as const;

export default MessageType;
