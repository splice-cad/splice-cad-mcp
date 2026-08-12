export interface CommandResult {
  success: boolean;
  error?: string;
  summary?: Record<string, unknown>;
}

/** Shared interface for both embedded BridgeServer and standalone BridgeClient */
export interface Bridge {
  readonly isConnected: boolean;
  getSecret(): string;
  getConnectedNamespaces(): Array<{ namespace: string; label?: string; appVersion?: string }>;
  /**
   * Capabilities the target client advertised at registration (resolved the same
   * way as sendCommand's namespace). Returns undefined when unknown — e.g. an
   * older app that doesn't declare capabilities — so callers must treat undefined
   * as "assume supported" for back-compat.
   */
  getClientCapabilities(namespace?: string): { appVersion?: string; commands?: string[] } | undefined;
  start(): Promise<void>;
  stop(): void;
  sendCommand(command: string, params: Record<string, unknown>, namespace?: string): Promise<CommandResult>;
  sendCommandBatch(
    commands: Array<{ command: string; params: Record<string, unknown> }>,
    description: string,
    namespace?: string,
  ): Promise<CommandResult>;
  query(queryName: string, params?: Record<string, unknown>, namespace?: string): Promise<unknown>;
}
