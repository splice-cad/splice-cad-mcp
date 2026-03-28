import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SpliceApiClient } from './api/client.js';
import { registerPartsTools } from './tools/parts.js';
import { registerProjectTools } from './tools/projects.js';
import { registerPlanTools } from './tools/plans.js';
import { registerAssemblyTools } from './tools/assemblies.js';
import { registerHarnessTools } from './tools/harnesses.js';
import { registerSchemaResource } from './resources/schema.js';
import { registerHarnessSchemaResource } from './resources/harness-schema.js';
import { registerExamplesResource } from './resources/examples.js';
import { registerLiveTools } from './tools/live.js';
import { BridgeServer } from './bridge/ws-server.js';
import { registerPrompts } from './prompts.js';

// ── Configuration ───────────────────────────────────────────────────────

const SPLICE_API_URL = process.env.SPLICE_API_URL;
const SPLICE_API_KEY = process.env.SPLICE_API_KEY;

if (!SPLICE_API_URL || !SPLICE_API_KEY) {
  console.error(
    'Missing required environment variables:\n' +
    '  SPLICE_API_URL - Splice backend URL (e.g. https://splice-cad.com)\n' +
    '  SPLICE_API_KEY - Your Splice API key (generate in Settings > API Key)\n',
  );
  process.exit(1);
}

// ── Server setup ────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'splice-cad',
  version: '0.1.0',
  description: 'Splice cable harness configurator — search parts, build plans, generate assemblies via AI agents.',
});

const client = new SpliceApiClient(SPLICE_API_URL, SPLICE_API_KEY);
const getClient = () => client;

// Register tools
registerPartsTools(server, getClient);
registerProjectTools(server, getClient);
registerPlanTools(server, getClient);
registerAssemblyTools(server, getClient);
registerHarnessTools(server, getClient);

// ── WebSocket bridge ────────────────────────────────────────────────────

const bridgePort = parseInt(process.env.SPLICE_BRIDGE_PORT || '9876', 10);
const bridgeSecret = process.env.SPLICE_BRIDGE_SECRET;  // Optional — auto-generated if not set
const bridge = new BridgeServer(bridgePort, bridgeSecret);
const getBridge = () => bridge;

// Register live tools (execute_command, undo, redo, etc.)
registerLiveTools(server, getBridge);

// Register resources
registerSchemaResource(server);
registerHarnessSchemaResource(server);
registerExamplesResource(server);

// Register prompts
registerPrompts(server);

// ── Start ───────────────────────────────────────────────────────────────

async function main() {
  // Start WebSocket bridge server for live canvas updates
  await bridge.start();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
