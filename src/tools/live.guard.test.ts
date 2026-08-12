import { describe, it, expect } from 'vitest';
import { unsupportedCommandError } from './live.js';
import type { Bridge } from '../bridge/types.js';

/** Minimal Bridge stub — only getClientCapabilities matters for the guard. */
function stubBridge(caps: { appVersion?: string; commands?: string[] } | undefined): Bridge {
  return {
    isConnected: true,
    getSecret: () => '',
    getConnectedNamespaces: () => [],
    getClientCapabilities: () => caps,
    start: async () => {},
    stop: () => {},
    sendCommand: async () => ({ success: true }),
    sendCommandBatch: async () => ({ success: true }),
    query: async () => ({}),
  };
}

describe('unsupportedCommandError (version/capability guard)', () => {
  it('blocks a command the connected app does not advertise, naming the version', () => {
    const bridge = stubBridge({ appVersion: 'abc123', commands: ['AddNodeCommand', 'AddLinkCommand'] });
    const err = unsupportedCommandError(bridge, 'InsertTerminationCommand');
    expect(err).toBeTruthy();
    expect(err).toContain('InsertTerminationCommand');
    expect(err).toContain('abc123');
  });

  it('allows a command the app advertises', () => {
    const bridge = stubBridge({ appVersion: 'abc123', commands: ['AddNodeCommand', 'InsertTerminationCommand'] });
    expect(unsupportedCommandError(bridge, 'InsertTerminationCommand')).toBeNull();
  });

  it('assumes supported when the app advertises no capabilities (older build, back-compat)', () => {
    expect(unsupportedCommandError(stubBridge(undefined), 'InsertTerminationCommand')).toBeNull();
    expect(unsupportedCommandError(stubBridge({ appVersion: 'x' }), 'InsertTerminationCommand')).toBeNull();
  });

  it('never blocks undo/redo sentinels', () => {
    const bridge = stubBridge({ commands: ['AddNodeCommand'] });
    expect(unsupportedCommandError(bridge, '__undo')).toBeNull();
    expect(unsupportedCommandError(bridge, '__redo')).toBeNull();
  });
});
