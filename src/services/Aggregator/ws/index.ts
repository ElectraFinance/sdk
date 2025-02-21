import { z } from 'zod';
import { validate as uuidValidate, v4 as uuidv4 } from 'uuid';
import MessageType from './MessageType.js';
import SubscriptionType from './SubscriptionType.js';
import {
  pingPongMessageSchema, initMessageSchema,
  errorSchema, orderBookSchema,
  assetPairsConfigSchema, addressUpdateSchema,
  isolatedAddressUpdateSchema, futuresTradesStreamSchema
} from './schemas/index.js';
import UnsubscriptionType from './UnsubscriptionType.js';
import type {
  AssetPairUpdate, OrderbookItem, Balance, CFDBalance,
  FuturesTradeInfo, Json, BasicAuthCredentials, IsolatedCFDBalance, FuturesTradesStream,
} from '../../../types.js';
import unsubscriptionDoneSchema from './schemas/unsubscriptionDoneSchema.js';
import assetPairConfigSchema from './schemas/assetPairConfigSchema.js';
import type { fullOrderSchema, orderUpdateSchema } from './schemas/addressUpdateSchema.js';
import type { isolatedFullOrderSchema, isolatedOrderUpdateSchema } from './schemas/isolatedAddressUpdateSchema.js';
import cfdAddressUpdateSchema from './schemas/cfdAddressUpdateSchema.js';
import isolatedCFDAddressUpdateSchema from './schemas/isolatedCFDAddressUpdateSchema.js';
import futuresTradeInfoSchema from './schemas/futuresTradeInfoSchema.js';
import { objectKeys } from '../../../utils/objectKeys.js';
import { WebsocketTransport, type BufferLike, type WebsocketTransportEvents } from '../../WebsocketTransport.js';
import { createNanoEvents, type Emitter } from 'nanoevents';
// import assertError from '../../../utils/assertError.js';
// import errorSchema from './schemas/errorSchema';

const UNSUBSCRIBE = 'u';
const SERVER_PING_INTERVAL = 10000;
const HEARBEAT_THRESHOLD = 5000;
// const HANDSHAKE_TIMEOUT = 5000;

const messageSchema = z.union([
  initMessageSchema,
  pingPongMessageSchema,
  addressUpdateSchema,
  isolatedAddressUpdateSchema,
  cfdAddressUpdateSchema,
  isolatedCFDAddressUpdateSchema,
  assetPairsConfigSchema,
  assetPairConfigSchema,
  orderBookSchema,
  futuresTradeInfoSchema,
  futuresTradesStreamSchema,
  errorSchema,
  unsubscriptionDoneSchema,
]);

type FuturesTradeInfoPayload = {
  s: string // wallet address
  i: string // pair
  a: number // amount
  l?: number // leverage
  p?: number // price
  sl?: number // slippage
  f?: number // blockchain fee (USDF)
  F?: number // volume fee
}

type PairsConfigSubscription = {
  callback: ({ kind, data }: {
    kind: 'initial' | 'update'
    data: Partial<Record<string, AssetPairUpdate>>
  }) => void
}

type PairConfigSubscription = {
  payload: string
  callback: ({ kind, data }: {
    kind: 'initial' | 'update'
    data: AssetPairUpdate
  }) => void
}

type AggregatedOrderbookSubscription = {
  payload: string
  callback: (
    asks: OrderbookItem[],
    bids: OrderbookItem[],
    pair: string
  ) => void
  errorCb?: (message: string) => void
}

type FuturesTradeInfoSubscription = {
  payload: FuturesTradeInfoPayload
  callback: (futuresTradeInfo: FuturesTradeInfo) => void
  errorCb?: (message: string) => void
}

type FuturesTradesStreamSubscription = {
  callback: (futuresTrades: FuturesTradesStream) => void
}

type IsolatedAddressUpdateUpdate = {
  kind: 'update'
  balances: Partial<
    Record<
      string,
      Balance
    >
  >
  order?: z.infer<typeof isolatedOrderUpdateSchema> | z.infer<typeof isolatedFullOrderSchema> | undefined
}

type AddressUpdateUpdate = {
  kind: 'update'
  balances: Partial<
    Record<
      string,
      Balance
    >
  >
  order?: z.infer<typeof orderUpdateSchema> | z.infer<typeof fullOrderSchema> | undefined
}

type IsolatedAddressUpdateInitial = {
  kind: 'initial'
  balances: Partial<
    Record<
      string,
      Balance
    >
  >
  orders?: Array<z.infer<typeof isolatedFullOrderSchema>> | undefined // The field is not defined if the user has no orders
}

type AddressUpdateInitial = {
  kind: 'initial'
  balances: Partial<
    Record<
      string,
      Balance
    >
  >
  orders?: Array<z.infer<typeof fullOrderSchema>> | undefined // The field is not defined if the user has no orders
}

type IsolatedCFDAddressUpdateUpdate = {
  kind: 'update'
  balances?: IsolatedCFDBalance[] | undefined
  order?: z.infer<typeof isolatedOrderUpdateSchema> | z.infer<typeof isolatedFullOrderSchema> | undefined
}

type CfdAddressUpdateUpdate = {
  kind: 'update'
  balance?: CFDBalance | undefined
  order?: z.infer<typeof orderUpdateSchema> | z.infer<typeof fullOrderSchema> | undefined
}

type IsolatedCFDAddressUpdateInitial = {
  kind: 'initial'
  balances: IsolatedCFDBalance[]
  orders?: Array<z.infer<typeof isolatedFullOrderSchema>> | undefined // The field is not defined if the user has no orders
}

type CfdAddressUpdateInitial = {
  kind: 'initial'
  balance: CFDBalance
  orders?: Array<z.infer<typeof fullOrderSchema>> | undefined // The field is not defined if the user has no orders
}

type IsolatedAddressUpdateSubscription = {
  payload: string
  callback: (data: IsolatedAddressUpdateUpdate | IsolatedAddressUpdateInitial) => void
  errorCb?: (message: string) => void
}

type AddressUpdateSubscription = {
  payload: string
  callback: (data: AddressUpdateUpdate | AddressUpdateInitial) => void
  errorCb?: (message: string) => void
}

type IsolatedCFDAddressUpdateSubscription = {
  payload: string
  callback: (data: IsolatedCFDAddressUpdateUpdate | IsolatedCFDAddressUpdateInitial) => void
}

type CfdAddressUpdateSubscription = {
  payload: string
  callback: (data: CfdAddressUpdateUpdate | CfdAddressUpdateInitial) => void
}

type Subscription = {
  [SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]: AddressUpdateSubscription
  [SubscriptionType.ISOLATED_ADDRESS_UPDATES_SUBSCRIBE]: IsolatedAddressUpdateSubscription
  [SubscriptionType.CFD_ADDRESS_UPDATES_SUBSCRIBE]: CfdAddressUpdateSubscription
  [SubscriptionType.ISOLATED_CFD_ADDRESS_UPDATES_SUBSCRIBE]: IsolatedCFDAddressUpdateSubscription
  [SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]: AggregatedOrderbookSubscription
  [SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]: PairsConfigSubscription
  [SubscriptionType.ASSET_PAIR_CONFIG_UPDATES_SUBSCRIBE]: PairConfigSubscription
  [SubscriptionType.FUTURES_TRADE_INFO_SUBSCRIBE]: FuturesTradeInfoSubscription
  [SubscriptionType.FUTURES_TRADES_STREAM_SUBSCRIBE]: FuturesTradesStreamSubscription
}

const exclusiveSubscriptions = [
  SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE,
] as const;

const isSubType = (subType: string): subType is keyof Subscription => Object.values(SubscriptionType).some((t) => t === subType);

const unknownMessageTypeRegex = /An unknown message type: '(.*)', json: (.*)/;
const nonExistentMessageRegex = /Could not cancel nonexistent subscription: (.*)/;

// type Message = {
//   message: Json
//   resolve: () => void
// };

const FUTURES_SUFFIX = 'USD';

export type AggregatorWsEvents = {
  open: WebsocketTransportEvents['open']
  close: WebsocketTransportEvents['close']
}

function isAllUpperCase(str: string) {
  return str === str.toUpperCase();
}

class AggregatorWS {
  private transport?: WebsocketTransport | undefined;

  // is used to make sure we do not need to renew ws subscription
  // we can not be sure that onclose event will recieve our code when we do `ws.close(4000)`
  // since sometimes it can be replaced with system one.
  // https://stackoverflow.com/questions/19304157/getting-the-reason-why-websockets-closed-with-close-code-1006
  private isClosedIntentionally = false;

  readonly subscriptions: Partial<{
    [K in keyof Subscription]: Partial<Record<string, Subscription[K]>>
  }> = {};

  public onInit: (() => void) | undefined

  public onError: ((err: string) => void) | undefined

  public logger: ((message: string) => void) | undefined

  private subIdReplacements: Partial<Record<string, string>> = {}

  private readonly wsUrl: string;

  private isAlive = false;

  get api() {
    const wsUrl = new URL(this.wsUrl);

    if (this.basicAuth) {
      wsUrl.username = this.basicAuth.username;
      wsUrl.password = this.basicAuth.password;
    }

    return wsUrl;
  }

  readonly instanceId = uuidv4();

  readonly basicAuth?: BasicAuthCredentials | undefined;

  readonly emitter: Emitter<AggregatorWsEvents>

  constructor(
    wsUrl: string,
    basicAuth?: BasicAuthCredentials
  ) {
    this.wsUrl = wsUrl
    this.basicAuth = basicAuth
    this.emitter = createNanoEvents()
  }

  private readonly handleWsOpen = () => {
    this.setupHeartbeat();
  }

  private sendRaw(data: BufferLike) {
    this.transport?.sendMessage(data);
  }

  private send(jsonObject: Json) {
    const jsonData = JSON.stringify(jsonObject);
    this.transport?.sendMessage(jsonData);
    this.logger?.(`Sent (${Date.now()}) : ${jsonData}`);
  }

  private hearbeatIntervalId: NodeJS.Timer | undefined;

  private setupHeartbeat() {
    const heartbeat = () => {
      if (this.isAlive) {
        this.isAlive = false;
      } else {
        this.logger?.('Heartbeat timeout');
        this.isClosedIntentionally = false;
        this.clearHeartbeat();
        this.transport?.close(4000);
      }
    };

    this.hearbeatIntervalId = setInterval(heartbeat, SERVER_PING_INTERVAL + HEARBEAT_THRESHOLD);
  }

  private clearHeartbeat() {
    this.isAlive = false;
    clearInterval(this.hearbeatIntervalId);
  }

  subscribe<T extends typeof SubscriptionType[keyof typeof SubscriptionType]>(
    type: T,
    subscription: Subscription[T],
    prevSubscriptionId?: string
  ) {
    const id = type === 'aobus'
      ? ((subscription as any).payload as string) // TODO: Refactor!!!
      : uuidv4();

    const makeSubscription = () => {
      const isExclusive = exclusiveSubscriptions.some((t) => t === type);
      const subRequest: Json = {};
      subRequest['T'] = type;
      subRequest['id'] = id;

      if ('payload' in subscription) {
        if (typeof subscription.payload === 'string') {
          subRequest['S'] = subscription.payload;
        } else { // SwapInfoSubscriptionPayload | FuturesTradeInfoPayload | FuturesTradesStreamSubscription
          subRequest['S'] = {
            d: id,
            ...subscription.payload,
          };
        }
      }

      const subKey = isExclusive ? 'default' : id;

      if (prevSubscriptionId === undefined) { // Just subscribe
        const subs = this.subscriptions[type];
        if (isExclusive && subs && Object.keys(subs).length > 0) {
          throw new Error(`Subscription '${type}' already exists. Please unsubscribe first.`);
        }
        this.logger?.(`Subscribing to ${type} with id ${id}. Subscription request: ${JSON.stringify(subRequest)}`);
        this.subscriptions[type] = {
          ...this.subscriptions[type],
          [subKey]: subscription,
        };
      } else { // Replace subscription. Set new sub id, but save callback
        this.logger?.(`Resubscribing to ${type} with id ${id}. Subscription request: ${JSON.stringify(subRequest)}`);
        const prevSub = this.subscriptions[type]?.[prevSubscriptionId];
        if (prevSub) {
          this.subIdReplacements[prevSubscriptionId] = id; // Save mapping for future use (unsubscribe)
          if (this.subscriptions[type]?.[prevSubscriptionId]) {
            delete this.subscriptions[type]?.[prevSubscriptionId];
          }
          this.subscriptions[type] = {
            ...this.subscriptions[type],
            [subKey]: {
              ...subscription,
              callback: prevSub.callback,
            }
          };
        }
      }

      this.logger?.(`Sending subscription request: ${JSON.stringify(subRequest)}`);
      this.send(subRequest);
    }

    // if (!this.ws) {
    //   this.initAsync()
    //     .then(() => {
    //       console.log(`Aggregator WS ${this.instanceId} is initialized`);
    //       makeSubscription();
    //     })
    //     .catch((err) => {
    //       assertError(err);
    //       this.onError?.(err.message);
    //     });
    // } else makeSubscription();

    if (!this.transport) {
      this.init();
    }
    makeSubscription();

    return id;
  }

  /**
   * Returns newest subscription id for given id. Subscription id can be changed during resubscription.
   * This function ensure that old subscription id will be replaced with newest one.
   * @param id Id of subscription
   * @returns Newest subscription id
   */
  getNewestSubscriptionId(id: string): string {
    const newId = this.subIdReplacements[id];
    if (newId !== undefined && newId !== id) {
      return this.getNewestSubscriptionId(newId);
    }
    return id;
  }

  unsubscribe(subscription: keyof typeof UnsubscriptionType | string, details?: string) {
    const newestSubId = this.getNewestSubscriptionId(subscription);
    this.send({
      T: UNSUBSCRIBE,
      S: newestSubId,
      ...(details !== undefined) && { d: details },
    });

    const isOrderBooksSubscription = (subId: string) => {
      return subId.endsWith(FUTURES_SUFFIX) && !subId.includes('-') && isAllUpperCase(subId);
    }

    if (newestSubId.includes('0x')) { // is wallet address (ADDRESS_UPDATE)
      const auSubscriptions = this.subscriptions[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE];
      if (auSubscriptions) {
        const targetAuSub = Object.entries(auSubscriptions).find(([, value]) => value?.payload === newestSubId);
        if (targetAuSub) {
          const [key] = targetAuSub;
          delete this.subscriptions[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]?.[key];
        }
      }

      const aufSubscriptions = this.subscriptions[SubscriptionType.CFD_ADDRESS_UPDATES_SUBSCRIBE];
      if (aufSubscriptions) {
        const targetAufSub = Object.entries(aufSubscriptions).find(([, value]) => value?.payload === newestSubId);
        if (targetAufSub) {
          const [key] = targetAufSub;
          delete this.subscriptions[SubscriptionType.CFD_ADDRESS_UPDATES_SUBSCRIBE]?.[key];
        }
      }
    } else if (uuidValidate(newestSubId)) {
      // is swap info subscription (contains hyphen)
      delete this.subscriptions[SubscriptionType.ASSET_PAIR_CONFIG_UPDATES_SUBSCRIBE]?.[newestSubId];
      delete this.subscriptions[SubscriptionType.FUTURES_TRADE_INFO_SUBSCRIBE]?.[newestSubId];
      delete this.subscriptions[SubscriptionType.FUTURES_TRADES_STREAM_SUBSCRIBE]?.[newestSubId];
      // !!! swap info subscription is uuid that contains hyphen
    } else if (isOrderBooksSubscription(newestSubId)) { // is pair name(AGGREGATED_ORDER_BOOK_UPDATE)
      const aobSubscriptions = this.subscriptions[SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE];
      if (aobSubscriptions) {
        const targetAobSub = Object.entries(aobSubscriptions).find(([, value]) => value?.payload === newestSubId);
        if (targetAobSub) {
          const [key] = targetAobSub;
          delete this.subscriptions[SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]?.[key];
        }
      }
    } else if (newestSubId === UnsubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptions[SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]?.['default'];
    }
  }

  destroy() {
    this.clearHeartbeat();
    this.isClosedIntentionally = true;
    this.transport?.destroy();
    delete this.transport;
  }

  // private initPromise: Promise<void> | null = null;

  // private initAsync() {
  //   if (!this.initPromise) {
  //     this.initPromise = new Promise<void>((resolve, reject) => {
  //       try {
  //         this.init();
  //         resolve();
  //       } catch (err) {
  //         reject(err);
  //       }
  //     });
  //   }

  //   return this.initPromise;
  // }

  public isOpen(): boolean {
    return this.transport?.isOpen === true;
  }

  public onWsOpen(openCallback: WebsocketTransportEvents['open']) {
    return this.emitter.on('open', openCallback);
  }

  public onWsClose(closeCallback: WebsocketTransportEvents['close']) {
    return this.emitter.on('close', closeCallback);
  }

  public init(isReconnect = false) {
    this.isClosedIntentionally = false;
    this.transport?.destroy();
    this.transport = new WebsocketTransport(this.api);
    this.transport.onError((err) => {
      this.onError?.(`AggregatorWS error: ${err.message}`);
      this.logger?.(`AggregatorWS: ${err.message}`);
    });
    this.transport.onClose((e) => {
      this.clearHeartbeat();
      this.transport?.unsubscribe();
      this.emitter.emit('close', e);
      this.logger?.(`AggregatorWS: connection closed ${this.isClosedIntentionally ? 'intentionally' : ''}`);
      if (!this.isClosedIntentionally) {
        setTimeout(() => {
          this.init(true)
        }, 5000)
      }
    });
    this.transport.onOpen((e) => {
      this.emitter.emit('open', e);
      this.handleWsOpen();
      // Re-subscribe to all subscriptions
      if (isReconnect) {
        Object.keys(this.subscriptions)
          .filter(isSubType)
          .forEach((subType) => {
            const subscriptions = this.subscriptions[subType];
            if (subscriptions) {
              Object.keys(subscriptions).forEach((subId) => {
                const subPayload = subscriptions[subId];
                this.logger?.(`AggregatorWS: reconnecting to subscription ${subType} ${subId}. Params: ${JSON.stringify(subPayload)}`);
                if (subPayload) this.subscribe(subType, subPayload, subId);
              });
            }
          });
      }
      this.logger?.(`AggregatorWS: connection opened${isReconnect ? ' (reconnect)' : ''}`);
    });
    this.transport.onMessage((e) => {
      this.isAlive = true;
      const { data } = e;
      if (typeof data !== 'string') throw new Error('AggregatorWS: received non-string message');
      this.logger?.(`AggregatorWS: received message: ${data}`);
      const rawJson: unknown = JSON.parse(data);

      const json = messageSchema.parse(rawJson);

      switch (json.T) {
        case MessageType.ERROR: {
          const err = errorSchema.parse(json);
          // Get subscription error callback
          // 2. Find subscription by id
          // 3. Call onError callback

          const { id, m } = err;
          if (id !== undefined) {
            const nonExistentMessageMatch = m.match(nonExistentMessageRegex);
            const unknownMessageMatch = m.match(unknownMessageTypeRegex);
            if (nonExistentMessageMatch !== null) {
              const [, subscription] = nonExistentMessageMatch;
              if (subscription === undefined) throw new TypeError('Subscription is undefined. This should not happen.')
              console.warn(`You tried to unsubscribe from non-existent subscription '${subscription}'. This is probably a bug in the code. Please be sure that you are unsubscribing from the subscription that you are subscribed to.`)
            } else if (unknownMessageMatch !== null) {
              const [, subscription, jsonPayload] = unknownMessageMatch;
              if (subscription === undefined) throw new TypeError('Subscription is undefined. This should not happen.')
              if (jsonPayload === undefined) throw new TypeError('JSON payload is undefined. This should not happen.')
              console.warn(`You tried to subscribe to '${subscription}' with unknown payload '${jsonPayload}'. This is probably a bug in the code. Please be sure that you are subscribing to the existing subscription with the correct payload.`)
            } else {
              const subType = objectKeys(this.subscriptions).find((st) => this.subscriptions[st]?.[id]);
              if (subType === undefined) throw new Error(`AggregatorWS: cannot find subscription type by id ${id}. Current subscriptions: ${JSON.stringify(this.subscriptions)}`);
              const sub = this.subscriptions[subType]?.[id];
              if (sub === undefined) throw new Error(`AggregatorWS: cannot find subscription by id ${id}. Current subscriptions: ${JSON.stringify(this.subscriptions)}`);
              if ('errorCb' in sub) {
                sub.errorCb(err.m);
              }
            }
          }
          this.onError?.(err.m);
        }
          break;
        case MessageType.PING_PONG:
          this.sendRaw(data);
          break;
        case MessageType.UNSUBSCRIPTION_DONE:
          // const { id } = json;
          break;
        case MessageType.FUTURES_TRADE_INFO_UPDATE:
          this.subscriptions[SubscriptionType.FUTURES_TRADE_INFO_SUBSCRIBE]?.[json.id]?.callback({
            futuresTradeRequestId: json.id,
            sender: json.S,
            instrument: json.i,
            leverage: json.l,
            buyPrice: json.bp,
            sellPrice: json.sp,
            buyPower: json.bpw,
            sellPower: json.spw,
            minAmount: json.ma,
          });
          break;
        case MessageType.FUTURES_TRADES_STREAM_UPDATE:
          this.subscriptions[SubscriptionType.FUTURES_TRADES_STREAM_SUBSCRIBE]?.[json.id]?.callback(
            {
              timestamp: json._,
              sender: json.S,
              id: json.id,
              instrument: json.i,
              side: json.s,
              positionSide: json.ps,
              amount: json.a,
              leverage: json.l,
              price: json.p,
              txHash: json.h,
              network: json.n,
              realizedPnL: json.rpnl,
              roi: json.r,
            }
          );
          break;
        case MessageType.INITIALIZATION:
          this.onInit?.();
          break;
        case MessageType.AGGREGATED_ORDER_BOOK_UPDATE: {
          const { ob, S } = json;
          const mapOrderbookItems = (rawItems: typeof ob.a | typeof ob.b) => rawItems.reduce<OrderbookItem[]>((acc, item) => {
            const [
              price,
              amount,
              vob,
            ] = item;

            acc.push({
              price,
              amount,
              vob: vob.map(([side, pairName]) => ({
                side,
                pairName,
              })),
            });

            return acc;
          }, []);
          this.subscriptions[
            SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE
          ]?.[json.S]?.callback(
            mapOrderbookItems(ob.a),
            mapOrderbookItems(ob.b),
            S,
          );
        }
          break;
        case MessageType.ASSET_PAIR_CONFIG_UPDATE: {
          const pair = json.u;
          const [, minQty, pricePrecision] = pair;

          this.subscriptions[
            SubscriptionType.ASSET_PAIR_CONFIG_UPDATES_SUBSCRIBE
          ]?.[json.id]?.callback({
            data: {
              minQty,
              pricePrecision,
            },
            kind: json.k === 'i' ? 'initial' : 'update',
          });

          break;
        }
        case MessageType.ASSET_PAIRS_CONFIG_UPDATE: {
          const pairs = json;
          const priceUpdates: Partial<Record<string, AssetPairUpdate>> = {};

          pairs.u.forEach(([pairName, minQty, pricePrecision]) => {
            priceUpdates[pairName] = {
              minQty,
              pricePrecision,
            };
          });

          this.subscriptions[
            SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE
          ]?.['default']?.callback({
            kind: json.k === 'i' ? 'initial' : 'update',
            data: priceUpdates,
          });
        }
          break;
        case MessageType.CFD_ADDRESS_UPDATE:
          switch (json.k) { // message kind
            case 'i': { // initial
              const fullOrders = (json.o)
                ? json.o.reduce<Array<z.infer<typeof fullOrderSchema>>>((prev, o) => {
                  prev.push(o);

                  return prev;
                }, [])
                : undefined;

              this.subscriptions[
                SubscriptionType.CFD_ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'initial',
                orders: fullOrders,
                balance: json.b,
              });
            }
              break;
            case 'u': { // update
              let orderUpdate: z.infer<typeof orderUpdateSchema> | z.infer<typeof fullOrderSchema> | undefined;
              if (json.o) {
                const firstOrder = json.o[0];
                orderUpdate = firstOrder;
              }

              this.subscriptions[
                SubscriptionType.CFD_ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'update',
                order: orderUpdate,
                balance: json.b,
              });
            }
              break;
            default:
              break;
          }
          break;
        case MessageType.ISOLATED_CFD_ADDRESS_UPDATE:
          switch (json.k) { // message kind
            case 'i': { // initial
              const isolatedFullOrders = (json.o)
                ? json.o.reduce<Array<z.infer<typeof isolatedFullOrderSchema>>>((prev, o) => {
                  prev.push(o);

                  return prev;
                }, [])
                : undefined;

              this.subscriptions[
                SubscriptionType.ISOLATED_CFD_ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'initial',
                orders: isolatedFullOrders,
                balances: json.b,
              });
            }
              break;
            case 'u': { // update
              let isolatedOrderUpdate: z.infer<typeof isolatedOrderUpdateSchema> | z.infer<typeof isolatedFullOrderSchema> | undefined;
              if (json.o) {
                const isolatedFirstOrder = json.o[0];
                isolatedOrderUpdate = isolatedFirstOrder;
              }

              this.subscriptions[
                SubscriptionType.ISOLATED_CFD_ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'update',
                order: isolatedOrderUpdate,
                balances: json.b,
              });
            }
              break;
            default:
              break;
          }
          break;
        case MessageType.ADDRESS_UPDATE: {
          const balances = (json.b)
            ? Object.entries(json.b)
              .reduce<Partial<Record<string, Balance>>>((prev, [asset, assetBalances]) => {
                if (!assetBalances) return prev;
                const [tradable, reserved, contract, wallet, allowance] = assetBalances;

                prev[asset] = {
                  tradable, reserved, contract, wallet, allowance,
                };

                return prev;
              }, {})
            : {};
          switch (json.k) { // message kind
            case 'i': { // initial
              const fullOrders = json.o
                ? json.o.reduce<Array<z.infer<typeof fullOrderSchema>>>((prev, o) => {
                  prev.push(o);

                  return prev;
                }, [])
                : undefined;

              this.subscriptions[
                SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'initial',
                orders: fullOrders,
                balances,
              });
            }
              break;
            case 'u': { // update
              let orderUpdate: z.infer<typeof orderUpdateSchema> | z.infer<typeof fullOrderSchema> | undefined;
              if (json.o) {
                const firstOrder = json.o[0];
                orderUpdate = firstOrder;
              }

              this.subscriptions[
                SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'update',
                order: orderUpdate,
                balances,
              });
            }
              break;
            default:
              break;
          }
        }
          break;
        case MessageType.ISOLATED_ADDRESS_UPDATE: {
          const balances = (json.b)
            ? Object.entries(json.b)
              .reduce<Partial<Record<string, Balance>>>((prev, [asset, assetBalances]) => {
                if (!assetBalances) return prev;
                const [tradable, reserved, contract, wallet, allowance] = assetBalances;

                prev[asset] = {
                  tradable, reserved, contract, wallet, allowance,
                };

                return prev;
              }, {})
            : {};
          switch (json.k) { // message kind
            case 'i': { // initial
              const isolatedFullOrders = json.o
                ? json.o.reduce<Array<z.infer<typeof isolatedFullOrderSchema>>>((prev, o) => {
                  prev.push(o);

                  return prev;
                }, [])
                : undefined;

              this.subscriptions[
                SubscriptionType.ISOLATED_ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'initial',
                orders: isolatedFullOrders,
                balances,
              });
            }
              break;
            case 'u': { // update
              let isolatedOrderUpdate: z.infer<typeof isolatedOrderUpdateSchema> | z.infer<typeof isolatedFullOrderSchema> | undefined;
              if (json.o) {
                const isolatedFirstOrder = json.o[0];
                isolatedOrderUpdate = isolatedFirstOrder;
              }

              this.subscriptions[
                SubscriptionType.ISOLATED_ADDRESS_UPDATES_SUBSCRIBE
              ]?.[json.id]?.callback({
                kind: 'update',
                order: isolatedOrderUpdate,
                balances,
              });
            }
              break;
            default:
              break;
          }
        }
          break;
        default:
          break;
      }
    });
  }
}

export * as schemas from './schemas/index.js';
export {
  AggregatorWS,
  SubscriptionType,
  UnsubscriptionType,
  MessageType,
};
