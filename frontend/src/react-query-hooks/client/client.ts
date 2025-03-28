/* tslint:disable */
/* eslint-disable */
import {
  SendChatMessageRequestContent,
  StreamLLMResponseRequestContent,
  UpdateInferenceStatusRequestContent,
} from '../models';
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { v4 as uuid } from 'uuid';

import WebSocket from 'isomorphic-ws';

export interface IamAuthenticationStrategy {
  readonly region: string;
  readonly credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
}

export interface NoneAuthenticationStrategy {}

export interface CustomAuthenticationStrategyInput {
  readonly url: string;
}

export interface CustomAuthenticationStrategyOutput {
  readonly url: string;
}

export interface CustomAuthenticationStrategy {
  readonly apply: (input: CustomAuthenticationStrategyInput) => Promise<CustomAuthenticationStrategyOutput>;
}

export type AuthenticationStrategy =
  | { iam: IamAuthenticationStrategy }
  | { none: NoneAuthenticationStrategy }
  | { custom: CustomAuthenticationStrategy };

/**
 * Options for the client
 */
export interface DefaultApiWebSocketClientOptions {
  /**
   * Websocket url to connect to (wss://xxxx)
   */
  readonly url: string;

  /**
   * Strategy to authenticate with the API
   * @default AuthenticationStrategy.NONE
   */
  readonly authentication?: AuthenticationStrategy;

  /**
   * Maximum number of times to attempt to reconnect if connecting fails.
   * @default 3
   */
  readonly maxRetries?: number;

  /**
   * After this amount of time has elapsed, reset the number of retries.
   * Ensures that stale connections closed by the browser (or node) are reconnected.
   * @default 10000
   */
  readonly resetRetriesAfterMilliseconds?: number;
}

enum SocketStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
}

interface QueuedMessage {
  readonly message: string;
  readonly resolve: () => void;
  readonly reject: () => void;
}

interface MessageListener {
  readonly id: string;
  readonly listener: (payload: any) => void;
}

interface ReconnectListener {
  readonly id: string;
  readonly listener: () => void;
}

interface AllMessagesListener {
  readonly id: string;
  readonly listener: (route: string, payload?: any) => void;
}

export interface WebSocketError {
  readonly message: string;
}

interface ErrorListener {
  readonly id: string;
  readonly listener: (error: WebSocketError) => void;
}

/**
 * Client for sending messages from clients to the server
 */
export class DefaultApiWebSocketClient {
  /**
   * Create a new WebSocket connection to the server
   */
  public static connect = async (options: DefaultApiWebSocketClientOptions) => {
    const client = new DefaultApiWebSocketClient(options);
    await client.$connect();
    return client;
  };

  private readonly options: DefaultApiWebSocketClientOptions;

  private socket: WebSocket | undefined;
  private status: SocketStatus = SocketStatus.CONNECTING;
  private readonly messageQueue: QueuedMessage[] = [];
  private listeners: { [route: string]: MessageListener[] } = {};
  private allMessageListeners: AllMessagesListener[] = [];
  private reconnectListeners: ReconnectListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private connectionAttempt: number = 0;
  private lastConnected: number = Date.now();

  private constructor(options: DefaultApiWebSocketClientOptions) {
    this.options = options;
  }

  private _signConnectionUrl = async (iam: IamAuthenticationStrategy) => {
    const url = new URL(this.options.url);

    const request = new HttpRequest({
      hostname: url.hostname,
      method: 'GET',
      path: url.pathname,
      protocol: url.protocol,
      headers: {
        host: url.hostname,
      },
      query: Object.fromEntries((url.searchParams ?? {}) as any),
    });

    const sigv4 = new SignatureV4({
      credentials: iam.credentials,
      service: 'execute-api',
      region: iam.region,
      sha256: Sha256,
    });

    const signedRequest = await sigv4.presign(request);

    Object.keys(signedRequest.query ?? {}).forEach((param) => {
      const value = (signedRequest.query ?? {})[param];
      if (value) {
        url.searchParams.set(param, value as any);
      }
    });

    return url.toString();
  };

  private _sleep = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  private _onClose = async (_event: WebSocket.CloseEvent) => {
    // @ts-ignore: Object is possibly 'null'.
    this.socket.onclose = null;
    // @ts-ignore: Object is possibly 'null'.
    this.socket.onmessage = null;
    // @ts-ignore: Object is possibly 'null'.
    this.socket.onerror = null;

    // After 10 seconds (or configured time), reset the number of retries so stale connections are always refreshed
    if (Date.now() - this.lastConnected > (this.options.resetRetriesAfterMilliseconds ?? 10000)) {
      this.connectionAttempt = 0;
    }

    if (this.connectionAttempt >= (this.options.maxRetries ?? 3)) {
      this._onDisconnect();
      const message = 'Connection failed after maximum number of retries';
      this.errorListeners.forEach(({ listener }) => listener({ message }));
      throw new Error(message);
    }

    this.connectionAttempt++;

    await this._sleep(2 ** this.connectionAttempt * 10);

    await this._connect();

    this.reconnectListeners.forEach(({ listener }) => listener());
  };

  private _listen = (route: string, listener: (payload: any) => void): (() => void) => {
    if (!this.listeners[route]) {
      this.listeners[route] = [];
    }

    const listenerId = uuid();
    this.listeners[route].push({
      id: listenerId,
      listener,
    });

    return () => {
      this.listeners[route] = this.listeners[route].filter(({ id }) => id !== listenerId);
    };
  };

  private _onMessage = async (event: WebSocket.MessageEvent) => {
    if (typeof event.data !== 'string' || !event.data) {
      return;
    }

    try {
      const data = JSON.parse(event.data);

      if ('message' in data && typeof data.message === 'string') {
        this.errorListeners.forEach(({ listener }) => listener({ message: data.message }));
      } else if ('route' in data) {
        (this.listeners[data.route] ?? []).forEach(({ listener }) => listener(data.payload));
        this.allMessageListeners.forEach(({ listener }) => listener(data.route, data.payload));
      } else {
        this.errorListeners.forEach(({ listener }) => listener({ message: `Unexpected data received ${event.data}` }));
      }
    } catch (e: any) {
      this.errorListeners.forEach(({ listener }) =>
        listener({ message: `Failed to parse received data ${event.data}` }),
      );
    }
  };

  private _onError = async (error: WebSocket.ErrorEvent) => {
    this.errorListeners.forEach(({ listener }) => listener({ message: error.message }));
  };

  private _sendOrQueueMessage = (route: string, payload?: any): Promise<void> => {
    const message = JSON.stringify({ route, payload });
    if (this.status === SocketStatus.CONNECTED) {
      this._send(message);
      return Promise.resolve();
    } else if (this.status === SocketStatus.DISCONNECTED) {
      return Promise.reject(new Error('The socket is not connected. Please call $connect before sending messages'));
    }
    // Status is CONNECTING, queue the message
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ message, resolve, reject });
    });
  };

  private _flushMessageQueue = () => {
    while (this.messageQueue.length > 0) {
      // @ts-ignore: Object is possibly 'null'.
      const { message, resolve } = this.messageQueue.shift();
      this._send(message);
      resolve();
    }
  };

  private _rejectMessageQueue = () => {
    while (this.messageQueue.length > 0) {
      // @ts-ignore: Object is possibly 'null'.
      const { reject } = this.messageQueue.shift();
      reject();
    }
  };

  private _send = (message: string) => {
    // @ts-ignore: Object is possibly 'null'.
    this.socket.send(message);
  };

  private _connect = async (): Promise<void> => {
    this.status = SocketStatus.CONNECTING;
    let url = this.options.url;
    if (this.options.authentication && 'iam' in this.options.authentication && this.options.authentication.iam) {
      url = await this._signConnectionUrl(this.options.authentication.iam);
    } else if (
      this.options.authentication &&
      'custom' in this.options.authentication &&
      this.options.authentication.custom
    ) {
      url = (await this.options.authentication.custom.apply({ url })).url;
    }

    // Create the socket and wait for it to open (or immediately close)
    this.socket = new WebSocket(url);
    await (() => {
      return new Promise<void>((resolve, reject) => {
        // @ts-ignore: Object is possibly 'null'.
        this.socket.onopen = () => {
          resolve();
        };
        // @ts-ignore: Object is possibly 'null'.
        this.socket.onclose = (event) => {
          // WebSocket closed immediately
          reject(event);
        };
      });
    })();
    this.socket.onmessage = this._onMessage;
    this.socket.onerror = this._onError;
    this.socket.onclose = this._onClose;
    this._flushMessageQueue();
    this.status = SocketStatus.CONNECTED;
    this.lastConnected = Date.now();
  };

  /**
   * Establish a connection to the server
   */
  public $connect = async (): Promise<void> => {
    this.connectionAttempt = 0;
    await this._connect();
  };

  private _onDisconnect = () => {
    this.status = SocketStatus.DISCONNECTED;
    this._rejectMessageQueue();
  };

  /**
   * Disconnect from the server. You must explicitly call $connect to re-establish the connection
   */
  public $disconnect = async () => {
    if (this.socket) {
      this._onDisconnect();
      await (() =>
        new Promise((resolve) => {
          // @ts-ignore: Object is possibly 'null'.
          this.socket.onclose = resolve;
          // @ts-ignore: Object is possibly 'null'.
          this.socket.close();
        }))();
      this.socket.onclose = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
    }
  };

  /**
   * Register a callback to be called whenever an error occurs.
   * @returns a function which will remove the listener when called.
   */
  public $onError = (listener: (err: WebSocketError) => void) => {
    const listenerId = uuid();
    this.errorListeners.push({
      id: listenerId,
      listener,
    });
    return () => {
      this.errorListeners = this.errorListeners.filter(({ id }) => id !== listenerId);
    };
  };

  /**
   * Register a callback to be called whenever any message is received.
   * Not recommended for use as this is not type-safe, prefer the "onXXXX" methods to listen to specific routes.
   */
  public $onAnyMessage = (listener: (route: string, payload?: any) => void) => {
    const listenerId = uuid();
    this.allMessageListeners.push({
      id: listenerId,
      listener,
    });
    return () => {
      this.allMessageListeners = this.allMessageListeners.filter(({ id }) => id !== listenerId);
    };
  };

  /**
   * Call the given function immediately, as well as registering it to be invoked whenever the
   * websocket reconnects, for example due to a connection timeout.
   * @returns a function which will deregister the listener from further calls on reconnect
   */
  public $withReconnect = (listener: () => void): (() => void) => {
    const listenerId = uuid();
    this.reconnectListeners.push({
      id: listenerId,
      listener,
    });
    listener();
    return () => {
      this.reconnectListeners = this.reconnectListeners.filter(({ id }) => id !== listenerId);
    };
  };

  /**
   * Send a "SendChatMessage" message to the server
   */
  public sendChatMessage = async (input: SendChatMessageRequestContent): Promise<void> => {
    await this._sendOrQueueMessage('SendChatMessage', input);
  };

  /**
   * Register a listener to be called whenever a "StreamLLMResponse" message is received from the server
   * @returns a function which will remove the listener when called.
   */
  public onStreamLLMResponse = (callback: (input: StreamLLMResponseRequestContent) => void): (() => void) => {
    return this._listen('StreamLLMResponse', callback);
  };

  /**
   * Register a listener to be called whenever a "UpdateInferenceStatus" message is received from the server
   * @returns a function which will remove the listener when called.
   */
  public onUpdateInferenceStatus = (callback: (input: UpdateInferenceStatusRequestContent) => void): (() => void) => {
    return this._listen('UpdateInferenceStatus', callback);
  };
}
