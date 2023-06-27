import WebSocket from 'isomorphic-ws';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import priceFeedSubscriptions from './priceFeedSubscriptions.js';
import { tickerInfoSchema, candleSchema } from './schemas/index.js';
import priceSchema from './schemas/priceSchema.js';
import type { Json } from '../../../types.js';
import allTickersSchema from './schemas/allTickersSchema.js';
import { createNanoEvents, type Emitter } from 'nanoevents';

export const subscriptions = {
  [priceFeedSubscriptions.ALL_TICKERS]: {
    schema: allTickersSchema,
    payload: false as const,
  },
  [priceFeedSubscriptions.TICKER]: {
    schema: z.tuple([z.number(), tickerInfoSchema]).transform(([, tickerInfo]) => tickerInfo),
    payload: true as const,
  },
  [priceFeedSubscriptions.LAST_PRICE]: {
    schema: priceSchema,
    payload: true as const,
  },
  [priceFeedSubscriptions.CANDLE]: {
    schema: candleSchema,
    payload: true as const,
  },
};

export type SubscriptionType = keyof typeof subscriptions;
export type Subscription<
  T extends SubscriptionType,
  Schema = z.infer<typeof subscriptions[T]['schema']>
> = typeof subscriptions[T] extends { payload: true }
  ? {
    callback: (data: Schema) => void
    errorCallback?: (error: Error) => void
    payload: string
  } : {
    callback: (data: Schema) => void
    errorCallback?: (error: Error) => void
  }

export type PriceFeedSubscriptionEvents<T extends SubscriptionType> = {
  open: (openEvent: WebSocket.Event) => void
  error: (error: WebSocket.ErrorEvent) => void
  close: (closeEvent: WebSocket.CloseEvent) => void
  message: <Schema = z.infer<typeof subscriptions[T]['schema']>>(data: Schema) => void
}

export default class PriceFeedSubscription<T extends SubscriptionType = SubscriptionType> {
  public readonly id: string;

  private readonly callback: Subscription<T>['callback'];

  private readonly errorCallback?: Subscription<T>['errorCallback'];

  private readonly payload?: string;

  private ws?: WebSocket;

  private readonly url: string;

  private heartbeatInterval?: ReturnType<typeof setInterval>;

  readonly type: T;

  // is used to make sure we do not need to renew ws subscription
  // we can not be sure that onclose event will recieve our code when we do `ws.close(4000)`
  // since sometimes it can be replaced with system one.
  // https://stackoverflow.com/questions/19304157/getting-the-reason-why-websockets-closed-with-close-code-1006
  private isClosedIntentionally = false;
  private readonly emitter: Emitter<PriceFeedSubscriptionEvents<T>>;

  constructor(
    type: T,
    url: string,
    params: Subscription<T>,
  ) {
    this.id = uuidv4();
    this.url = url;
    this.type = type;
    this.emitter = createNanoEvents();
    if ('payload' in params) {
      this.payload = params.payload;
    }
    this.callback = params.callback;
    this.errorCallback = params.errorCallback;
    this.init();
  }

  onOpen(openCallback: PriceFeedSubscriptionEvents<T>['open']) {
    return this.emitter.on('open', openCallback);
  }

  onClose(closeCallback: PriceFeedSubscriptionEvents<T>['close']) {
    return this.emitter.on('close', closeCallback);
  }

  onError(errorCallback: PriceFeedSubscriptionEvents<T>['error']) {
    return this.emitter.on('error', errorCallback);
  }

  onMessage(messageCallback: PriceFeedSubscriptionEvents<T>['message']) {
    return this.emitter.on('message', messageCallback);
  }

  private send(jsonObject: Json) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const jsonData = JSON.stringify(jsonObject);
      this.ws.send(jsonData);
    } else {
      setTimeout(() => {
        this.send(jsonObject);
      }, 50);
    }
  }

  init() {
    this.isClosedIntentionally = false;

    const { payload, url, type } = this;
    this.ws = new WebSocket(
      `${url}/${type}${payload !== undefined
        ? `/${payload.toString()}`
        : ''}`
    );

    this.ws.onopen = (event) => { this.emitter.emit('open', event); };
    this.ws.onclose = (event) => { this.emitter.emit('close', event); }
    this.ws.onerror = (event) => { this.emitter.emit('error', event); }
    this.ws.onmessage = (e) => {
      const { data } = e;

      // Convert data to string

      let dataString: string;
      if (typeof data === 'string') {
        dataString = data;
      } else if (Buffer.isBuffer(data)) {
        dataString = data.toString();
      } else if (Array.isArray(data)) {
        dataString = Buffer.concat(data).toString();
      } else { // ArrayBuffer
        dataString = Buffer.from(data).toString();
      }

      if (dataString === 'pong') return;
      const json: unknown = JSON.parse(dataString);
      const subscription = subscriptions[type];
      const parseResult = subscription.schema.safeParse(json);
      if (!parseResult.success) {
        const errorsMessage = parseResult.error.errors.map((error) => `[${error.path.join('.')}] ${error.message}`).join(', ');
        const error = new Error(`Can't recognize PriceFeed "${type}" subscription message "${dataString}": ${errorsMessage}`);
        if (this.errorCallback !== undefined) {
          this.errorCallback(error);
        } else throw error;
      } else {
        this.callback(parseResult.data);
        this.emitter.emit('message', parseResult.data);
      }
    };

    this.ws.onclose = () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (!this.isClosedIntentionally) this.init();
    };

    this.heartbeatInterval = setInterval(() => {
      this.send('heartbeat');
    }, 15000);
  }

  kill() {
    this.isClosedIntentionally = true;
    this.ws?.close();
  }
}
