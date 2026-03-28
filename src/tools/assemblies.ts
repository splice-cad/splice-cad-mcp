import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpliceApiClient } from '../api/client.js';

export function registerAssemblyTools(server: McpServer, getClient: () => SpliceApiClient) {
  server.tool(
    'generate_assembly',
    'Generate a harness assembly from a plan by selecting which nodes and bundles to include. Returns the created harness ID. The assembly appears in Splice as an editable harness linked to the project.',
    {
      project_id: z.string().describe('Project UUID'),
      name: z.string().describe('Assembly name (e.g. "Main Harness", "Power Distribution")'),
      node_ids: z.array(z.string()).describe('PlanNode IDs to include'),
      link_ids: z.array(z.string()).describe('PlanLink IDs to include'),
      description: z.string().optional().describe('Assembly description'),
    },
    async ({ project_id, name, node_ids, link_ids, description }) => {
      const harness = await getClient().generateAssembly(project_id, name, node_ids, link_ids, description);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            harness_id: harness.id,
            name: harness.name,
          }, null, 2),
        }],
      };
    },
  );
}
