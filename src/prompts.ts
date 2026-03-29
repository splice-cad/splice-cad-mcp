import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer) {

  // ── Context-setting prompts ────────────────────────────────────────────
  // These establish which mode the agent is operating in and which tools to use.

  server.prompt(
    'plan-live',
    'Work on the plan currently open in the browser via the live WebSocket bridge. Changes appear on the canvas instantly with full undo/redo.',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are working on a **plan** through the **live WebSocket bridge**. The user has a plan open in their browser and you can make changes that appear in real-time on their canvas.

## Context: Plan Live Bridge

**Namespace pattern:** \`project:<uuid>\`

**Your primary tools:**
- \`is_bridge_connected\` — check connection first, always
- \`get_live_state({ query: "getSummary" })\` — component/link/conductor counts + warnings
- \`get_live_state({ query: "getData" })\` — full PlanData (large — prefer getSummary first)
- \`execute_commands\` — **preferred** for all modifications (batched, atomic, single undo)
- \`execute_command\` — single command only when truly one operation
- \`undo\` / \`redo\` — undo/redo in the browser

**Available supporting tools:**
- \`search_connectors\` / \`search_wires\` / \`search_cables\` — find parts in the database
- \`lookup_part\` — DigiKey lookup for images, datasheets, specs
- \`create_component\` / \`create_cable\` — create custom parts
- \`get_plan_summary\` / \`validate_plan\` — server-side summary and validation (uses last saved state, not live)

**DO NOT use in live mode:**
- \`save_plan\` — the browser holds the live state; the user saves when they choose to
- \`get_plan\` — use \`get_live_state\` instead, which reflects unsaved changes

**Key patterns:**
- Always batch operations with \`execute_commands\` — 10-50x faster than individual calls
- Commands auto-inject the user's active page ID (multi-page plans)
- Read the \`splice://schema/plan-data\` resource for PlanData structure and command reference
- Read the \`splice://examples/plans\` resource for copy-paste-ready wiring patterns
- Terminal blocks need intermediate ferrule nodes — never connect conductors directly to terminal block pins

**Workflow:**
1. \`is_bridge_connected\` — verify connection
2. \`get_live_state({ query: "getSummary" })\` — understand current state
3. Plan your changes, batch them into \`execute_commands\` calls
4. Verify with another \`getSummary\` after changes`,
        },
      }],
    }),
  );

  server.prompt(
    'component-creator-live',
    'Work in the Component Creator page via the live WebSocket bridge. Create or edit a component with SVG graphics, pin placement, and specs in real-time.',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are working in the **Component Creator** through the **live WebSocket bridge**. The user has the Connector Creator page open and you can update form fields, specs, SVG elements, and pins in real-time.

## Context: Component Creator Live Bridge

**Namespace pattern:** \`component:<uuid>\` or \`component:new\`

**Your primary tools:**
- \`is_bridge_connected\` — check connection first, always
- \`get_live_state({ query: "getComponentState" })\` — read form, spec, pins, element count
- \`get_live_state({ query: "getSvgElements" })\` — read full SVG element details (shapes, positions, dimensions)
- \`get_live_state({ query: "setComponentState", params: {...} })\` — update form, spec, SVG, or trigger actions

**Available supporting tools:**
- \`lookup_part\` — DigiKey lookup for images, datasheets, specs (great starting point)
- \`get_category_templates\` — discover category-specific spec fields (fuse ratings, relay voltage, etc.)
- \`search_connectors\` — check if part already exists in database

**DO NOT use in component creator mode:**
- \`execute_command\` / \`execute_commands\` — these are for plan commands, not the component creator
- \`save_plan\` / \`get_plan\` — wrong context entirely

**setComponentState params structure:**
\`\`\`json
{
  "form": {
    "mpn": "B4B-XH-A",
    "manufacturer": "JST",
    "description": "CONN HEADER VERT 4POS 2.5MM",
    "img_url": "https://...",
    "datasheet_url": "https://..."
  },
  "spec": {
    "gender": "male",
    "shape": "rectangular",
    "category": "connector",
    "positions": 4,
    "rows": 1,
    "series": "XH",
    "pitch_mm": 2.5,
    "wire_awg_min": 28,
    "wire_awg_max": 22
  },
  "svg": {
    "clear": true,
    "elements": { "rectangles": [], "circles": [], "polygons": [], "lines": [], "paths": [] },
    "pins": [{ "pinNumber": "1", "x": 120, "y": 120, "radius": 8, "gender": "female" }]
  },
  "action": "save"
}
\`\`\`

**SVG coordinate system:**
- Canvas is roughly 800x600 pixels, but coordinates can be negative (centered connectors use -150 to +150)
- Circles use \`cx\`, \`cy\`, \`r\` — NOT \`x\`, \`y\`, \`radius\`
- Pins use \`x\`, \`y\`, \`radius\` — NOT \`cx\`, \`cy\`, \`r\`
- Layers: 0 = background, 1 = mid, 2 = foreground, 3 = details (higher renders on top)

**Actions:**
- \`"action": "save"\` — save the component to the database
- \`"action": "createNew"\` — reset the form for a new component

**Workflow:**
1. \`is_bridge_connected\` — verify connection
2. \`lookup_part\` — research the part (MPN, image, datasheet, specs)
3. \`get_category_templates\` — discover relevant spec fields
4. \`setComponentState\` with form + spec + svg — push to the editor
5. \`getComponentState\` — verify the state
6. Iterate on SVG/pins as needed
7. \`setComponentState({ action: "save" })\` — save when ready`,
        },
      }],
    }),
  );

  server.prompt(
    'api-mode',
    'Work with Splice via the REST API — no browser connection needed. Create projects, build plans, search parts, manage harnesses, and generate assemblies.',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are working with **Splice via the REST API** — no browser connection needed. You can create projects, build plans from JSON, search parts, manage legacy harnesses, and generate assemblies entirely through API calls.

## Context: REST API Mode

**Project & plan tools:**
- \`create_project\` / \`list_projects\` / \`get_project\` — project management
- \`get_plan\` / \`save_plan\` — read and write plan data (full PlanData JSON)
- \`get_plan_summary\` — structured summary (components, bundles, conductors, warnings)
- \`validate_plan\` — check for structural issues (orphan nodes, dangling conductors, etc.)
- \`generate_assembly\` — generate a harness assembly from a plan selection

**Parts tools:**
- \`search_connectors\` / \`search_wires\` / \`search_cables\` — search the parts database
- \`get_part\` — full part details by ID
- \`lookup_part\` — DigiKey lookup for images, datasheets, specs
- \`create_component\` / \`create_cable\` — create custom parts
- \`get_category_templates\` — discover category-specific spec fields

**Legacy harness tools:**
- \`list_harnesses\` / \`create_harness\` / \`get_harness\` / \`save_harness\` — harness CRUD
- \`get_harness_summary\` — structured harness overview

**DO NOT use in API mode (these require a live browser connection):**
- \`execute_command\` / \`execute_commands\`
- \`get_live_state\`
- \`undo\` / \`redo\`
- \`is_bridge_connected\`

**Key patterns:**
- Read the \`splice://schema/plan-data\` resource for PlanData structure
- Read the \`splice://examples/plans\` resource for copy-paste-ready wiring patterns
- Build complete plan JSON and use \`save_plan\` to persist — it auto-corrects colors
- Use \`get_plan_summary\` + \`validate_plan\` after saving to verify
- Terminal blocks need intermediate ferrule nodes — never connect conductors directly to terminal block pins
- Conductor colors should be hex strings (\`"#FF0000"\`); \`save_plan\` auto-converts color names

**Workflow:**
1. Research parts: \`lookup_part\`, web search, or user description
2. \`create_project\` — create a project
3. Read \`splice://schema/plan-data\` and \`splice://examples/plans\` for reference
4. Build the plan JSON: nodes, links, conductors, BOM entries, nets
5. \`save_plan\` to persist
6. \`get_plan_summary\` + \`validate_plan\` to verify
7. Fix any issues and re-save
8. \`generate_assembly\` to create a harness from the plan`,
        },
      }],
    }),
  );

  // ── Task-oriented prompts ──────────────────────────────────────────────
  // These combine a specific task with the appropriate context.

  server.prompt(
    'build-harness',
    'Build a complete cable harness from a description or datasheet (REST API mode)',
    { description: z.string().describe('What the harness should do, or paste datasheet content') },
    ({ description }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Build a cable harness based on this:\n\n${description}\n\nYou are working in **REST API mode** — no browser connection needed.\n\nWorkflow:\n1. Research parts (web search + lookup_part for real MPNs, images, datasheets)\n2. Create a project with create_project\n3. Read the splice://schema/plan-data resource for PlanData structure\n4. Read the splice://examples/plans resource for wiring patterns\n5. Build the plan JSON: nodes (components with pins), links (bundles), conductors (wires with gauge/color), BOM entries, nets\n6. Remember: terminal blocks need intermediate ferrule nodes — never connect conductors directly to terminal block pins\n7. Use save_plan to write it (auto-corrects colors)\n8. Run get_plan_summary and validate_plan to verify\n9. Fix any issues\n10. Generate assembly with generate_assembly`,
        },
      }],
    }),
  );

  server.prompt(
    'create-component',
    'Create a rich component with specs, image, and pin labels (REST API mode)',
    { part: z.string().describe('MPN, part description, or paste datasheet excerpt') },
    ({ part }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Create a component for: ${part}\n\nYou are working in **REST API mode** — creating the part directly in the database.\n\nWorkflow:\n1. Use lookup_part to find it on DigiKey (get image, datasheet, specs)\n2. If not found, use web search to research the part\n3. Use get_category_templates to discover category-specific spec fields\n4. Call create_component with ALL available data: mpn, manufacturer, description, img_url, datasheet_url, positions, pin_labels, gender, shape, series, category_specs\n5. Report the created part ID`,
        },
      }],
    }),
  );

  server.prompt(
    'review-live-plan',
    'Connect to the open browser tab, read the live plan state, and suggest improvements (Plan Live Bridge mode)',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Review the plan currently open in the browser.\n\nYou are working in **Plan Live Bridge** mode (namespace: \`project:<uuid>\`).\n\nWorkflow:\n1. Check is_bridge_connected — if not connected, tell the user to enable Agent Bridge in Splice settings\n2. Use get_live_state({ query: "getSummary" }) to read live state\n3. Use get_live_state({ query: "getData" }) for full details if needed\n4. Summarize what you see: component count, connection topology, any issues\n5. Check for: unconnected pins, missing BOM assignments, overlapping positions, missing wire gauges/colors\n6. Suggest improvements or ask the user what they want to change\n7. When making changes, use execute_commands (batched) — changes appear on canvas in real-time\n\nDo NOT use save_plan — the browser holds the live state. The user saves when ready.`,
        },
      }],
    }),
  );

  server.prompt(
    'cleanup-layout',
    'Read the current plan layout and reorganize overlapping or poorly spaced components (Plan Live Bridge mode)',
    {},
    () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help clean up the plan layout in the connected browser tab.\n\nYou are working in **Plan Live Bridge** mode (namespace: \`project:<uuid>\`).\n\n1. Check is_bridge_connected first\n2. Use get_live_state({ query: "getSummary" }) to read component positions\n3. Identify overlapping nodes, uneven spacing, or poor arrangement\n4. Use execute_commands to batch-move nodes to better positions\n5. Consider AlignNodesCommand or DistributeNodesCommand for consistent alignment\n6. Show what you changed\n\nDo NOT use save_plan — the browser holds the live state.`,
        },
      }],
    }),
  );

  server.prompt(
    'import-from-spreadsheet',
    'Build a harness from a wiring schedule spreadsheet (REST API mode)',
    { spreadsheet: z.string().describe('Paste spreadsheet content or describe the file') },
    ({ spreadsheet }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Build a harness from this wiring schedule:\n\n${spreadsheet}\n\nYou are working in **REST API mode** — no browser connection needed.\n\n1. Parse the spreadsheet — identify columns: From connector, From pin, To connector, To pin, Wire gauge, Wire color, Signal name\n2. Extract unique connectors and their pin counts\n3. Research parts with web search or lookup_part\n4. Create project, read splice://schema/plan-data and splice://examples/plans, build plan JSON\n5. Remember: terminal blocks need intermediate ferrule nodes\n6. save_plan and validate_plan`,
        },
      }],
    }),
  );
}
