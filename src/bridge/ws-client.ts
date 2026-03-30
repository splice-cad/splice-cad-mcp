import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import type { Bridge, CommandResult } from './types.js';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket bridge client that connects to a standalone splice-bridge router.
 * Implements the same public API as BridgeServer so live tools work unchanged.
 */
export class BridgeClient implements Bridge {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private port: number;
  private secret: string;
  private connected = false;
  private connectedNamespaces: Array<{ namespace: string; label?: string }> = [];

  constructor(port = 9876, secret?: string) {
    this.port = port;
    this.secret = secret || '';
  }

  getSecret(): string {
    return this.secret;
  }

  get isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectedNamespaces(): Array<{ namespace: string; label?: string }> {
    return this.connectedNamespaces;
  }

  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = `ws://127.0.0.1:${this.port}`;
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.error(`[bridge-client] Connected to splice-bridge on port ${this.port}`);
        // Register as an agent
        this.ws!.send(JSON.stringify({
          type: 'register_agent',
          label: 'splice-cad-mcp',
          ...(this.secret ? { secret: this.secret } : {}),
        }));
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Registration acknowledgement with current browser namespaces
          if (msg.type === 'registered' && msg.namespaces) {
            this.connectedNamespaces = msg.namespaces.map((ns: string) => ({ namespace: ns }));
            console.error(`[bridge-client] Bridge has ${this.connectedNamespaces.length} browser tab(s) connected`);
            return;
          }

          // Result routed back from a browser tab
          if (msg.type === 'result' && msg.id) {
            const pending = this.pending.get(msg.id);
            if (pending) {
              this.pending.delete(msg.id);
              clearTimeout(pending.timeout);
              pending.resolve(msg);
            }
            return;
          }

          // Error from the bridge router
          if (msg.type === 'error' && msg.id) {
            const pending = this.pending.get(msg.id);
            if (pending) {
              this.pending.delete(msg.id);
              clearTimeout(pending.timeout);
              pending.reject(new Error(msg.error || 'Bridge error'));
            }
            return;
          }
        } catch {
          // Ignore malformed messages
        }
      });

      this.ws.on('close', () => {
        console.error('[bridge-client] Disconnected from splice-bridge');
        this.connected = false;
        this.connectedNamespaces = [];
        // Reject all pending requests
        for (const [id, pending] of this.pending) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Bridge connection closed'));
          this.pending.delete(id);
        }
      });

      this.ws.on('error', (err) => {
        if (!this.connected) {
          reject(err);
        } else {
          console.error('[bridge-client] WebSocket error:', err.message);
        }
      });
    });
  }

  stop(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Bridge client stopping'));
      this.pending.delete(id);
    }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  async sendCommand(command: string, params: Record<string, unknown>, namespace?: string): Promise<CommandResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to splice-bridge');
    }

    const id = randomUUID();
    const msg = { type: 'command', id, command, params, ...(namespace ? { namespace } : {}) };

    return new Promise<CommandResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command "${command}" timed out after 10s`));
      }, 10_000);

      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
      this.ws!.send(JSON.stringify(msg));
    });
  }

  async sendCommandBatch(
    commands: Array<{ command: string; params: Record<string, unknown> }>,
    description: string,
    namespace?: string,
  ): Promise<CommandResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to splice-bridge');
    }

    const id = randomUUID();
    const msg = { type: 'command_batch', id, commands, description, ...(namespace ? { namespace } : {}) };

    return new Promise<CommandResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Command batch timed out after 30s'));
      }, 30_000);

      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
      this.ws!.send(JSON.stringify(msg));
    });
  }

  async query(queryName: string, params?: Record<string, unknown>, namespace?: string): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to splice-bridge');
    }

    const id = randomUUID();
    const msg = { type: 'query', id, query: queryName, params, ...(namespace ? { namespace } : {}) };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Query "${queryName}" timed out after 5s`));
      }, 5_000);

      this.pending.set(id, { resolve, reject, timeout });
      this.ws!.send(JSON.stringify(msg));
    });
  }
}
