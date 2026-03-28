import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const HARNESS_DATA_SCHEMA = `# Splice Legacy Harness Schema Reference

Use this schema to construct valid WorkingHarness JSON for the \`save_harness\` tool.

**For standard wire colors, gauges, designator prefixes, component categories, and mating behavior**, see the \`plan_schema\` resource — those rules are identical for legacy harnesses.

## Quick Start — Minimal Valid Harness

\`\`\`json
{
  "name": "My Harness",
  "is_public": false,
  "bom": {
    "X1": {
      "instance_id": "X1",
      "part": {
        "part_id": "00000000-0000-0000-0000-000000000001",
        "kind": "connector",
        "mpn": "DT04-4P",
        "manufacturer": "Deutsch",
        "description": "DT Series 4-Pin Receptacle",
        "spec": { "positions": 4, "contact_gender": "female", "series": "DT", "shape": "rectangular", "rows": 1 }
      },
      "unit": "each"
    },
    "X2": {
      "instance_id": "X2",
      "part": {
        "part_id": "00000000-0000-0000-0000-000000000002",
        "kind": "connector",
        "mpn": "DT06-4S",
        "manufacturer": "Deutsch",
        "description": "DT Series 4-Pin Plug",
        "spec": { "positions": 4, "contact_gender": "male", "series": "DT", "shape": "rectangular", "rows": 1 }
      },
      "unit": "each"
    },
    "W1": {
      "instance_id": "W1",
      "part": {
        "part_id": "00000000-0000-0000-0000-000000000003",
        "kind": "wire",
        "mpn": "18 AWG Red",
        "manufacturer": "Generic",
        "spec": { "awg": 18, "color": "red", "conductor_type": "stranded" }
      },
      "unit": "m"
    }
  },
  "data": {
    "mapping": {
      "W1": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 1, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 1, "side": "right" },
        "length_mm": 500
      }
    },
    "connector_positions": {
      "X1": { "x": 100, "y": 200 },
      "X2": { "x": 600, "y": 200 }
    },
    "wire_anchors": {}
  }
}
\`\`\`

## WorkingHarness (root)

\`\`\`typescript
{
  name: string;                           // REQUIRED for create_harness
  is_public?: boolean;                    // REQUIRED for create_harness (usually false)
  description?: string;                   // Optional top-level description
  bom: Record<string, ExpandedBomItem>;  // Parts inventory keyed by instance ID
  data: WorkingData;                      // Canvas state + connections
  harness_id?: string;                    // UUID (set after first save — required for save_harness)
  revision_id?: string;                   // UUID (set after first save — required for save_harness)
  last_modified_at?: string;              // ISO timestamp (for conflict detection)
}
\`\`\`

## BOM Instance Keys

Parts are keyed by auto-incrementing instance identifiers:

| Part type | Key prefix | Examples |
|-----------|-----------|---------|
| Connector | X | X1, X2, X3 |
| Wire | W | W1, W2, W3 |
| Cable | C | C1, C2, C3 |
| Terminal | T | T1, T2, T3 |

When adding parts, use the next available key (e.g., if J1 and J2 exist, the next connector is J3).

## ExpandedBomItem

\`\`\`typescript
{
  instance_id: string;            // "X1", "W1", "C1", "T1"
  part: Part;                     // Full Part object (see below)
  unit: string;                   // "each" for connectors/terminals, "m" for wires/cables
  custom_designator?: string;     // User override for display
  display_designator?: string;    // Auto-generated (same as instance_id by default)
}
\`\`\`

## Part Object

Parts in the BOM are full Part objects with type-specific specs:

\`\`\`typescript
{
  part_id: string;         // REQUIRED — UUID from search results (part.id). The backend
                           // uses this to link back to the DB part. For custom/synthetic
                           // parts not in the DB, use a prefix like "SYNTHETIC-xxx".
  kind: "connector" | "wire" | "cable" | "terminal" | "assembly";
  mpn: string;             // Manufacturer Part Number
  manufacturer: string;    // Manufacturer name
  description?: string;
  datasheet_url?: string;
  img_url?: string;
  spec?: {                 // Kind-specific nested spec
    connector?: ConnectorSpec;
    wire?: WireSpec;
    cable?: CableSpec;
  };
}
\`\`\`

**Important**: The field is \`part_id\` (not \`id\`). The backend's dehydration process
looks for \`part.part_id\` and will reject the payload with \`"no part_id for Wn"\` if missing.
When using parts from search results, set \`part_id\` to the search result's \`id\` field.

**Critical — Flat spec format**: The \`spec\` object must be **flat** — fields like \`series\`,
\`positions\`, \`awg\`, \`color\` go directly on \`spec\`, NOT nested under \`spec.connector\` or
\`spec.wire\`. The frontend reads \`bomEntry.part.spec.series\` directly for connector rendering.
Nested specs cause "Unsupported series: unknown" errors and broken connector graphics.

\`\`\`json
// WRONG — nested spec (won't render)
"spec": { "connector": { "series": "Nano-Fit", "positions": 8 } }

// CORRECT — flat spec
"spec": { "series": "Nano-Fit 105308", "positions": 8, "rows": 2, "shape": "rectangular" }
\`\`\`

Search results return specs in the nested format (\`spec.connector\`). **Flatten them** when
building harness BOM: copy the contents of \`spec.connector\` or \`spec.wire\` up to \`spec\`.

### ConnectorSpec (flat on part.spec — NOT nested under spec.connector)

\`\`\`typescript
{
  positions: number;           // Pin count (REQUIRED)
  contact_gender?: "male" | "female" | "none";
  shape?: ConnectorShape;      // "rectangular", "circular", "dsub", "terminal_block", etc.
  category?: ConnectorCategory; // "fuse", "relay", "circuit_breaker", etc.
  series?: string;             // "Nano-Fit 105308", "Micro-Fit 3.0 43645", "DT", etc.
  rows?: number;               // Number of pin rows (1 or 2)
  pitch_mm?: number;
  row_spacing_mm?: number;
  contact_termination?: string; // "Crimp", "Solder", etc.
  color?: string;              // Housing color
  wire_awg_min?: number;
  wire_awg_max?: number;
  bridged_positions?: number[][];  // Internally bridged pins
  part_id?: string;            // Same UUID as the top-level part_id
}
\`\`\`

### WireSpec (flat on part.spec — NOT nested under spec.wire)

\`\`\`typescript
{
  awg?: number;                // Wire gauge as number (18, 20, 22)
  color?: string;              // Color NAME ("red", "black") — NOT hex
  stripe?: string;             // Stripe color NAME
  conductor_type: "solid" | "stranded";
  stranding?: string;          // "7/32" for stranded
  voltage?: number;            // Voltage rating
  conductor_material?: string; // "Copper, Tinned"
  jacket_material?: string;    // "Poly-Vinyl Chloride (PVC)"
  part_id?: string;            // Same UUID as the top-level part_id
}
\`\`\`

**Note**: Wire gauge in legacy harnesses is a **number** in the spec (e.g., \`18\`), not a string like \`"18 AWG"\`.

**Note**: Search results return specs in **nested** format (\`result.spec.connector.*\`).
You must **flatten** them when building harness BOM entries — copy the fields from
\`result.spec.connector\` directly onto \`part.spec\`.

### CableSpec (flat on part.spec for cable BOM entries)

\`\`\`typescript
{
  core_count: number;          // Number of conductors
  shielded?: boolean;
  jacket_color?: string;       // Jacket color NAME (e.g., "black")
  is_generic?: boolean;        // True for user-created cables
  cores: Array<{
    core_no: number;           // 1-based core number
    designation: string;       // Core label (e.g., "1", "2", "Shield")
    core_color: string;        // HEX color (e.g., "#FF0000") — NOT color name
    awg?: number;
    conductor_type?: string;   // "stranded" or "solid"
  }>;
}
\`\`\`

**Important**: Cable core colors use \`core_color\` with **hex values** (e.g., \`"#FF0000"\`),
NOT color names. This differs from wire specs which use color names (e.g., \`"red"\`).
Each core also needs a \`designation\` string.

### Cable Wire BOM Entries

When using a cable, each core gets its own wire BOM entry keyed as \`C1.1\`, \`C1.2\`, etc.
These entries need a \`wireOverrides\` field with the hex color:

\`\`\`json
{
  "C1.1": {
    "instance_id": "C1.1",
    "part": {
      "part_id": "generic-wire-W1",
      "kind": "wire",
      "mpn": "WIRE-22AWG-RED",
      "manufacturer": "Generic",
      "description": "22 AWG red wire",
      "spec": { "awg": 22, "color": "red", "conductor_type": "stranded" }
    },
    "unit": "m",
    "wireOverrides": { "color": "#FF0000" }
  }
}
\`\`\`

Cable wire connections use the \`cable_core\` endpoint type and reference \`C1.1\`, \`C1.2\`
etc. as the wire key in the mapping (not \`W1\`, \`W2\`).

## WorkingData

\`\`\`typescript
{
  mapping: Record<string, Connection>;           // Wire instance → connection
  connector_positions: Record<string, Position>; // Connector instance → canvas position
  wire_anchors: Record<string, Position>;        // Wire instance → anchor position
  name?: string;
  description?: string;
}
\`\`\`

## Connection

Each wire in the mapping connects two endpoints:

\`\`\`typescript
{
  end1?: ConnectionTermination;     // One end of the wire
  end2?: ConnectionTermination;     // Other end of the wire
  label_end1?: string;              // Signal name at end1 (e.g., "12V_In")
  label_end2?: string;              // Signal name at end2
  length_mm?: number;               // Wire length in mm
  twisted_pair_id?: string;         // Groups wires into twisted pairs
}
\`\`\`

## ConnectionTermination

Three types of wire endpoints:

### connector_pin — Wire connects to a connector pin

\`\`\`typescript
{
  type: "connector_pin";
  connector_instance: string;    // BOM key (e.g., "X1")
  pin: number;                   // Pin number (1-based)
  side: "left" | "right";       // Which side of the connector
  terminal_instance?: string;    // Terminal BOM key if using a terminal (e.g., "T1")
}
\`\`\`

### cable_core — Wire connects to a cable core

\`\`\`typescript
{
  type: "cable_core";
  cable_instance: string;        // BOM key (e.g., "C1")
  core_no: number;               // Core number (1-based)
  side: "left" | "right";
  shield?: boolean;              // True if connecting to the cable shield
}
\`\`\`

### flying_lead — Bare wire end

\`\`\`typescript
{
  type: "flying_lead";
  termination_type: "tinned" | "bare" | "heat_shrink";
  strip_length_mm?: number;
  tin_length_mm?: number;
  terminal_instance?: string;    // Terminal BOM key if using a ring/spade terminal
}
\`\`\`

## Position

\`\`\`typescript
{
  x: number;
  y: number;
  width?: number;
  height?: number;
  collapsed?: boolean;    // Connector pin visibility
  hidden?: boolean;       // Wire bundle hidden
  compact?: boolean;      // Wire bundle compact mode
}
\`\`\`

## Key Differences from Plan Mode

| Aspect | Plan Mode | Legacy Harness |
|--------|-----------|----------------|
| Data structure | PlanData (flat nodes/links/conductors) | WorkingHarness (BOM + mapping) |
| Part references | BomEntry ID in bom[] array | Instance key (J1, W1) in bom record |
| Wire colors | Hex on PlanConductor | Color NAME in wire Part spec |
| Wire gauge | String "18 AWG" | Number 18 in wire Part spec |
| Connections | PlanConductor with endpoints | Connection with end1/end2 terminations |
| Pin numbering | Pin ID strings (pin_xxx) | Pin numbers (1-based integers) |

## Building a Harness Step by Step

1. **Search for parts** using \`search_connectors\`, \`search_wires\`, etc.
2. **Build the BOM**: create entries for each connector (J1, J2...), wire (W1, W2...), and optionally cables (C1...) and terminals (T1...)
3. **Create connections**: for each wire Wn, define end1 and end2 as connector_pin, cable_core, or flying_lead
4. **Set positions**: place connectors on the canvas via connector_positions
5. **Save**: use \`create_harness\` for new or \`save_harness\` for existing

## Using Parts from Search Results

When you find a part via search, use it directly in the BOM. Copy the \`id\` from the
search result into \`part_id\`:

\`\`\`json
{
  "X1": {
    "instance_id": "X1",
    "part": {
      "part_id": "<id from search result>",
      "kind": "connector",
      "mpn": "<from search result>",
      "manufacturer": "<from search result>",
      "description": "<from search result>",
      "spec": "<from search result>"
    },
    "unit": "each"
  }
}
\`\`\`

The \`part_id\` field is critical — it links back to the database part for BOM hydration on reload.
Without it the backend will reject the save with \`"no part_id for Jn"\`.
`;

export function registerHarnessSchemaResource(server: McpServer) {
  server.resource(
    'harness_schema',
    'splice://schema/harness-data',
    {
      description: 'JSON schema and documentation for Splice legacy WorkingHarness. Read this before constructing harnesses with save_harness.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'splice://schema/harness-data',
        mimeType: 'text/markdown',
        text: HARNESS_DATA_SCHEMA,
      }],
    }),
  );
}
