import PriceFeedSubscription, { type SubscriptionType, type Subscription, type PriceFeedSubscriptionEvents } from './PriceFeedSubscription.js';
import type { BasicAuthCredentials } from '../../../types.js';

export * as schemas from './schemas/index.js';
export class PriceFeedWS {
  private subscriptions: Partial<{
    [K in SubscriptionType]: Partial<
      Record<
        string,
        PriceFeedSubscription<K>
      >
    >;
  }> = {};

  private readonly url: string;

  readonly basicAuth?: BasicAuthCredentials | undefined;

  constructor(
    url: string,
    basicAuth?: BasicAuthCredentials
  ) {
    this.url = url;
    this.basicAuth = basicAuth;
  }

  get api() {
    const url = new URL(this.url);

    if (this.basicAuth) {
      url.username = this.basicAuth.username;
      url.password = this.basicAuth.password;
    }

    return url.toString();
  }

  subscribe<S extends SubscriptionType>(
    type: S,
    params: Subscription<S>,
  ) {
    const sub = new PriceFeedSubscription(
      type,
      this.api,
      params,
    );
    this.subscriptions = {
      ...this.subscriptions,
      [type]: {
        ...this.subscriptions[type],
        [sub.id]: sub,
      },
    };
    return {
      type: sub.type,
      id: sub.id,
      unsubscribe: () => { this.unsubscribe(sub.type, sub.id); },
      onOpen(openCallback: PriceFeedSubscriptionEvents<S>['open']) {
        return sub.onOpen(openCallback);
      },
      onClose(closeCallback: PriceFeedSubscriptionEvents<S>['close']) {
        return sub.onClose(closeCallback);
      },
      onError(errorCallback: PriceFeedSubscriptionEvents<S>['error']) {
        return sub.onError(errorCallback);
      },
      onMessage(messageCallback: PriceFeedSubscriptionEvents<S>['message']) {
        return sub.onMessage(messageCallback);
      }
    };
  }

  unsubscribe(subType: SubscriptionType, subId: string) {
    this.subscriptions[subType]?.[subId]?.kill();
    delete this.subscriptions[subType]?.[subId];
  }
}
