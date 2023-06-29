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
}

export class WebsocketTransport {
  private ws?: WebSocket;
  private readonly emitter: Emitter<WebsocketTransportEvents>;
  private readonly address: URL | string;
  private readonly options: WebSocket.ClientOptions | ClientRequestArgs | undefined;

  constructor(address: URL | string, options?: WebSocket.ClientOptions | ClientRequestArgs) {
    this.address = address;
    this.options = options;
    this.emitter = createNanoEvents<WebsocketTransportEvents>();
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.address, this.options);

    this.ws.onerror = (error) => {
      this.emitter.emit('error', error);
    }
    this.ws.onmessage = (message) => {
      this.emitter.emit('message', message);
    }
    this.ws.onclose = (closeEvent) => {
      this.emitter.emit('close', closeEvent);
    }
    this.ws.onopen = (openEvent) => {
      this.emitter.emit('open', openEvent);
      this.flushMessageQueue();
    }
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
    for (const message of this.messageQueue) {
      this.ws?.send(message);
    }
    this.messageQueue = [];
  }

  onClose(closeCallback: WebsocketTransportEvents['close']) {
    return this.emitter.on('close', closeCallback)
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
    this.ws?.close(code, data);
  }

  destroy(code?: number, data?: Buffer) {
    this.ws?.close(code, data);
    delete this.ws;
  }
}
