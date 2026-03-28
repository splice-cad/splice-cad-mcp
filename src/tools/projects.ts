import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpliceApiClient } from '../api/client.js';

export function registerProjectTools(server: McpServer, getClient: () => SpliceApiClient) {
  server.tool(
    'list_projects',
    'List all projects owned by the authenticated user.',
    {},
    async () => {
      const projects = await getClient().listProjects();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(projects.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            modified_at: p.modified_at,
          })), null, 2),
        }],
      };
    },
  );

  server.tool(
    'create_project',
    'Create a new Splice project. Returns the project ID and details.',
    {
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
    },
    async ({ name, description }) => {
      const project = await getClient().createProject(name, description);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: project.id,
            name: project.name,
            description: project.description,
            created_at: project.created_at,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_project',
    'Get a project with its plan and assembly list.',
    {
      project_id: z.string().describe('Project UUID'),
    },
    async ({ project_id }) => {
      const response = await getClient().getProject(project_id);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            project: {
              id: response.project.id,
              name: response.project.name,
              description: response.project.description,
            },
            has_plan: !!response.plan,
            plan_generation: response.plan?.generation,
            assemblies: response.assemblies?.map(a => ({
              harness_id: a.harness_id,
              name: a.harness_name,
            })) ?? [],
          }, null, 2),
        }],
      };
    },
  );
}
