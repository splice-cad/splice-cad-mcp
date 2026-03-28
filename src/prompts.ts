import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer) {
  server.prompt(
    'build-harness',
    'Build a complete cable harness from a description or datasheet',
    { description: z.string().describe('What the harness should do, or paste datasheet content') },
    ({ description }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Build a cable harness based on this:\n\n${description}\n\nWorkflow:\n1. Research parts (web search + lookup_part for real MPNs, images, datasheets)\n2. Create a project with create_project\n3. Read the plan_schema resource for PlanData structure\n4. Build the plan JSON: nodes (components with pins), links (bundles), conductors (wires with gauge/color), BOM entries, nets\n5. Use save_plan to write it\n6. Run get_plan_summary and validate_plan to verify\n7. Fix any issues\n8. Generate assembly with generate_assembly`,
        },
      }],
    }),
  );

  server.prompt(
    'create-component',
    'Create a rich component with specs, image, and pin labels',
    { part: z.string().describe('MPN, part description, or paste datasheet excerpt') },
    ({ part }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Create a component for: ${part}\n\nWorkflow:\n1. Use lookup_part to find it on DigiKey (get image, datasheet, specs)\n2. If not found, use web search to research the part\n3. Call create_component with ALL available data: mpn, manufacturer, description, img_url, datasheet_url, positions, pin_labels, gender, shape, series, category_specs\n4. Report the created part ID`,
        },
      }],
    }),
  );

  server.prompt(
    'review-live-plan',
    'Connect to the open Splice browser tab via WebSocket, read the live plan state, and help review or modify the design',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Review the harness currently open in the browser.\n\nWorkflow:\n1. Check is_bridge_connected — if not connected, tell the user to enable Agent Bridge in Splice settings\n2. Use get_live_state({ query: "getSummary" }) to read the live plan: components with positions, pins, connections, warnings\n3. Summarize what you see: component count, connection topology, any issues\n4. Check for: unconnected pins, missing BOM assignments, overlapping positions, missing wire gauges/colors\n5. Suggest improvements or ask the user what they want to change\n6. When making changes, use execute_commands (batched) for live updates — the user will see changes on their canvas in real-time`,
        },
      }],
    }),
  );

  server.prompt(
    'cleanup-layout',
    'Read the current plan layout and help reorganize overlapping or poorly spaced components',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help clean up the harness layout in the connected browser tab.\n\n1. Check is_bridge_connected first\n2. Use get_live_state({ query: "getSummary" }) to read component positions\n3. Identify overlapping nodes, uneven spacing, or poor arrangement\n4. Use execute_commands to batch-move nodes to better positions\n5. Consider AlignNodesCommand or DistributeNodesCommand for consistent alignment\n6. Show what you changed`,
        },
      }],
    }),
  );

  server.prompt(
    'import-from-spreadsheet',
    'Build a harness from a wiring schedule spreadsheet (CSV/Excel)',
    { spreadsheet: z.string().describe('Paste spreadsheet content or describe the file') },
    ({ spreadsheet }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Build a harness from this wiring schedule:\n\n${spreadsheet}\n\n1. Parse the spreadsheet — identify columns: From connector, From pin, To connector, To pin, Wire gauge, Wire color, Signal name\n2. Extract unique connectors and their pin counts\n3. Research parts with web search or lookup_part\n4. Create project, read plan_schema, build plan JSON\n5. save_plan and validate_plan`,
        },
      }],
    }),
  );
}
