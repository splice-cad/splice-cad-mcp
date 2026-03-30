import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Bridge } from '../bridge/types.js';

function errorResult(err: unknown) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }, null, 2),
    }],
  };
}

export function registerLiveTools(server: McpServer, getBridge: () => Bridge) {
  server.tool(
    'is_bridge_connected',
    'Check which browser tabs are connected via the WebSocket bridge. Returns connected namespaces (project/harness IDs). When connected, you can use execute_command for live canvas updates with undo/redo.',
    {},
    async () => {
      const bridge = getBridge();
      const namespaces = bridge.getConnectedNamespaces();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            connected: bridge.isConnected,
            tabs: namespaces,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'execute_command',
    'Execute a single plan command through the live WebSocket bridge. PREFER execute_commands (plural) for batching multiple operations in one call — it is much faster. Only use this for truly single operations. Canvas updates immediately, action added to undo history.',
    {
      command: z.string().describe('Command class name (e.g. "AddNodeCommand", "AddLinkCommand")'),
      params: z.record(z.unknown()).describe('Constructor parameters as JSON (excluding store refs)'),
      namespace: z.string().optional().describe('Target a specific tab by namespace (e.g. "project:uuid"). Omit to use the most recently connected tab.'),
    },
    async ({ command, params, namespace }) => {
      try {
        const result = await getBridge().sendCommand(command, params, namespace);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'execute_commands',
    'PREFERRED over execute_command. Execute multiple commands in a single call — much faster than calling execute_command repeatedly. All commands run atomically and undo as one action. Batch everything: add component + assign BOM + create link + add conductors — all in one call.',
    {
      commands: z.array(z.object({
        command: z.string().describe('Command class name'),
        params: z.record(z.unknown()).describe('Constructor parameters'),
      })).describe('Array of commands to execute in order'),
      description: z.string().default('AI agent action').describe('Description for undo history'),
      namespace: z.string().optional().describe('Target tab namespace'),
    },
    async ({ commands, description, namespace }) => {
      try {
        const result = await getBridge().sendCommandBatch(commands, description, namespace);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'undo',
    'Undo the last command in the Splice frontend.',
    {
      namespace: z.string().optional().describe('Target tab namespace'),
    },
    async ({ namespace }) => {
      try {
        const result = await getBridge().sendCommand('__undo', {}, namespace);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'redo',
    'Redo the last undone command in the Splice frontend.',
    {
      namespace: z.string().optional().describe('Target tab namespace'),
    },
    async ({ namespace }) => {
      try {
        const result = await getBridge().sendCommand('__redo', {}, namespace);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_live_state',
    'Get or set live frontend state. Reflects all unsaved changes. Use setComponentState to update the Component Creator form fields.',
    {
      query: z.enum([
        'getData', 'getSummary', 'canUndo', 'canRedo',
        'getComponentState', 'getSvgElements',
        'setComponentState',
      ]).describe('Plan: getData, getSummary, canUndo, canRedo. Component creator: getComponentState, getSvgElements, setComponentState (requires params).'),
      params: z.record(z.unknown()).optional().describe('Parameters for mutations like setComponentState. Keys: form (mpn, manufacturer, description, img_url, datasheet_url), spec (gender, shape, category, positions, rows, series, pitch_mm, wire_awg_min, wire_awg_max), svg (clear, elements, pins), action ("save" to save component, "createNew" to reset)'),
      namespace: z.string().optional().describe('Target tab namespace'),
    },
    async ({ query, params, namespace }) => {
      try {
        const result = await getBridge().query(query, params, namespace);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
