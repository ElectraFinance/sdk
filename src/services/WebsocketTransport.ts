import type { ClientRequestArgs } from 'http';
import WebSocket from 'isomorphic-ws';
import type { Emitter } from 'nanoevents';
import { createNanoEvents } from 'nanoevents';

export type BufferLike =
  | string
  | Buffer
  | DataView
  | number
  | ArrayBufferView
  | Uint8Array
  | ArrayBuffer
  | SharedArrayBuffer
  | readonly unknown[]
  | readonly number[]
  | { valueOf: () => ArrayBuffer }
  | { valueOf: () => SharedArrayBuffer }
  | { valueOf: () => Uint8Array }
  | { valueOf: () => readonly number[] }
  | { valueOf: () => string }
  | { [Symbol.toPrimitive]: (hint: string) => string };

export type WebsocketTransportEvents = {
  message: (messageEvent: WebSocket.MessageEvent) => void
  open: (openEvent: WebSocket.Event) => void
  error: (error: WebSocket.ErrorEvent) => void
  close: (closeEvent: WebSocket.CloseEvent) => void
};

export class WebsocketTransport {
  private ws?: WebSocket;
  private readonly emitter: Emitter<WebsocketTransportEvents>;
  private readonly address: URL | string;
  private readonly options:
  | WebSocket.ClientOptions
  | ClientRequestArgs
  | undefined;

  constructor(
    address: URL | string,
    options?: WebSocket.ClientOptions | ClientRequestArgs
  ) {
    this.address = address;
    this.options = options;
    this.emitter = createNanoEvents<WebsocketTransportEvents>();
    this.connect();
  }

  public get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  unsubscribe() {
    this.emitter.events = {};

    this.ws?.removeEventListener('open', this.handleOpen);
    this.ws?.removeEventListener('close', this.handleClose);
    this.ws?.removeEventListener('message', this.handleMessage);
    this.ws?.removeEventListener('error', this.handleError);
  }

  handleError = (error: WebSocket.ErrorEvent) => {
    this.emitter.emit('error', error);
  };

  handleMessage = (message: WebSocket.MessageEvent) => {
    this.emitter.emit('message', message);
  };

  handleClose = (closeEvent: WebSocket.CloseEvent) => {
    this.emitter.emit('close', closeEvent);
  };

  handleOpen = (openEvent: WebSocket.Event) => {
    this.flushMessageQueue();
    this.emitter.emit('open', openEvent);
  };

  private connect() {
    this.ws = new WebSocket(this.address, this.options);

    this.ws.addEventListener('error', this.handleError);
    this.ws.addEventListener('message', this.handleMessage);
    this.ws.addEventListener('close', this.handleClose);
    this.ws.addEventListener('open', this.handleOpen);
  }

  reconnect() {
    this.connect();
  }

  onError(errorCallback: WebsocketTransportEvents['error']) {
    return this.emitter.on('error', errorCallback);
  }

  onMessage(messageCallback: WebsocketTransportEvents['message']) {
    return this.emitter.on('message', messageCallback);
  }

  private flushMessageQueue() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      for (const message of this.messageQueue) {
        this.ws.send(message);
      }
      this.messageQueue = [];
    }
  }

  onClose(closeCallback: WebsocketTransportEvents['close']) {
    return this.emitter.on('close', closeCallback);
  }

  onOpen(openCallback: WebsocketTransportEvents['open']) {
    return this.emitter.on('open', openCallback);
  }

  private messageQueue: BufferLike[] = [];
  sendMessage(message: BufferLike) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  close(code?: number, data?: Buffer) {
    try {
      this.ws?.close(code, data);
    } catch (e) {
      console.error(e);
    }
  }

  destroy(code?: number, data?: Buffer) {
    this.close(code, data);
    this.unsubscribe();
    delete this.ws;
  }
}
