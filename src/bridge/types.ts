export interface CommandResult {
  success: boolean;
  error?: string;
  summary?: Record<string, unknown>;
}

/** Shared interface for both embedded BridgeServer and standalone BridgeClient */
export interface Bridge {
  readonly isConnected: boolean;
  getSecret(): string;
  getConnectedNamespaces(): Array<{ namespace: string; label?: string }>;
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
