import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

export interface CommandResult {
  success: boolean;
  error?: string;
  summary?: Record<string, unknown>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface ConnectedClient {
  ws: WebSocket;
  namespace: string;  // e.g. "project:uuid" or "harness:uuid"
  label?: string;     // human-readable, e.g. "Engine Harness"
}

/**
 * WebSocket bridge server that Splice frontend tabs connect to.
 * Supports multiple tabs — each registers with a namespace (project/harness ID).
 * MCP tools target a specific namespace, or the default (most recently connected) client.
 */
export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient>();  // namespace → client
  private defaultNamespace: string | null = null;
  private pending = new Map<string, PendingRequest>();
  private port: number;
  private secret: string;

  constructor(port = 9876, secret?: string) {
    this.port = port;
    // Only enforce secret if explicitly provided via SPLICE_BRIDGE_SECRET env var
    this.secret = secret || '';
  }

  /** The secret that frontends must send in the register message to authenticate */
  getSecret(): string {
    return this.secret;
  }

  get isConnected(): boolean {
    return this.clients.size > 0;
  }

  /** List all connected namespaces with labels */
  getConnectedNamespaces(): Array<{ namespace: string; label?: string }> {
    return Array.from(this.clients.values()).map(c => ({
      namespace: c.namespace,
      label: c.label,
    }));
  }

  async start(): Promise<void> {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      let clientNamespace: string | null = null;

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Registration message from frontend
          if (msg.type === 'register') {
            // Verify shared secret only if one was configured via env var
            if (this.secret && msg.secret !== this.secret) {
              console.error('[bridge] Client rejected: invalid secret');
              ws.close(4001, 'Invalid bridge secret');
              return;
            }
            clientNamespace = msg.namespace || 'default';
            const label = msg.label;

            // Close existing client on same namespace
            const existing = this.clients.get(clientNamespace!);
            if (existing && existing.ws !== ws && existing.ws.readyState === WebSocket.OPEN) {
              existing.ws.close(1000, 'Replaced by new tab');
            }

            this.clients.set(clientNamespace!, { ws, namespace: clientNamespace!, label });
            this.defaultNamespace = clientNamespace;
            console.error(`[bridge] Client registered: ${clientNamespace}${label ? ` (${label})` : ''} — ${this.clients.size} total`);
            return;
          }

          // Response to a pending request
          if (msg.type === 'result' && msg.id) {
            const pending = this.pending.get(msg.id);
            if (pending) {
              this.pending.delete(msg.id);
              clearTimeout(pending.timeout);
              pending.resolve(msg);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        if (clientNamespace && this.clients.get(clientNamespace)?.ws === ws) {
          this.clients.delete(clientNamespace);
          console.error(`[bridge] Client disconnected: ${clientNamespace} — ${this.clients.size} remaining`);

          // Update default if the disconnected one was default
          if (this.defaultNamespace === clientNamespace) {
            const remaining = Array.from(this.clients.keys());
            this.defaultNamespace = remaining.length > 0 ? remaining[remaining.length - 1]! : null;
          }

          // Reject pending requests that were for this namespace
          for (const [id, pending] of this.pending) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(`Client disconnected: ${clientNamespace}`));
            this.pending.delete(id);
          }
        }
      });

      ws.on('error', (err) => {
        console.error('[bridge] WebSocket error:', err.message);
      });
    });

    this.wss.on('error', (err) => {
      console.error(`[bridge] Server error: ${err.message}`);
    });

    console.error(`[bridge] WebSocket server listening on port ${this.port}`);
    console.error(`[bridge] Bridge secret: ${this.secret}`);

    // Write connection info to a well-known file so the frontend can auto-discover it
    try {
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const infoPath = path.join(os.homedir(), '.splice-bridge.json');
      fs.writeFileSync(infoPath, JSON.stringify({
        port: this.port,
        secret: this.secret,
        pid: process.pid,
        started: new Date().toISOString(),
      }));
    } catch {
      // Non-fatal — frontend can fall back to manual config
    }
  }

  stop(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Bridge server stopping'));
      this.pending.delete(id);
    }
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    this.wss?.close();

    // Clean up discovery file
    import('fs').then(fs => {
      import('os').then(os => {
        import('path').then(path => {
          const infoPath = path.join(os.homedir(), '.splice-bridge.json');
          try { fs.unlinkSync(infoPath); } catch { /* non-fatal */ }
        });
      });
    }).catch(() => { /* non-fatal */ });
  }

  /** Resolve which client to send to */
  private resolveClient(namespace?: string): ConnectedClient {
    if (namespace) {
      const client = this.clients.get(namespace);
      if (!client) throw new Error(`No browser tab connected for "${namespace}". Connected: ${this.getConnectedNamespaces().map(c => c.namespace).join(', ') || 'none'}`);
      return client;
    }
    if (this.defaultNamespace) {
      const client = this.clients.get(this.defaultNamespace);
      if (client) return client;
    }
    if (this.clients.size > 0) {
      return Array.from(this.clients.values())[0]!;
    }
    throw new Error('No browser tabs connected. Open Splice in your browser and enable Agent Bridge.');
  }

  /**
   * Send a command to a specific namespace (or default).
   */
  async sendCommand(command: string, params: Record<string, unknown>, namespace?: string): Promise<CommandResult> {
    const client = this.resolveClient(namespace);
    const id = randomUUID();
    const msg = { type: 'command', id, command, params };

    return new Promise<CommandResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command "${command}" timed out after 10s`));
      }, 10_000);

      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
      client.ws.send(JSON.stringify(msg));
    });
  }

  /**
   * Send a batch of commands to execute atomically.
   */
  async sendCommandBatch(
    commands: Array<{ command: string; params: Record<string, unknown> }>,
    description: string,
    namespace?: string,
  ): Promise<CommandResult> {
    const client = this.resolveClient(namespace);
    const id = randomUUID();
    const msg = { type: 'command_batch', id, commands, description };

    return new Promise<CommandResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Command batch timed out after 30s'));
      }, 30_000);

      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
      client.ws.send(JSON.stringify(msg));
    });
  }

  /**
   * Query live state from a specific namespace (or default).
   */
  async query(queryName: string, params?: Record<string, unknown>, namespace?: string): Promise<unknown> {
    const client = this.resolveClient(namespace);
    const id = randomUUID();
    const msg = { type: 'query', id, query: queryName, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Query "${queryName}" timed out after 5s`));
      }, 5_000);

      this.pending.set(id, { resolve, reject, timeout });
      client.ws.send(JSON.stringify(msg));
    });
  }
}
