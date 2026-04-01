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

When adding parts, use the next available key (e.g., if X1 and X2 exist, the next connector is X3).

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
    core_color: string;        // Color NAME from standard set (e.g., "orange", "white", "blue")
    stripe?: string;           // Stripe color NAME (e.g., "orange" for white/orange pair)
    awg?: number;
    conductor_type?: string;   // "stranded" or "solid"
  }>;
}
\`\`\`

**Important**: Cable core colors use \`core_color\` with **color names** from the standard set
(e.g., \`"orange"\`, \`"white"\`, \`"blue"\`) — same format as wire spec colors.
For striped cores (e.g., white/orange), set \`core_color: "white"\` and \`stripe: "orange"\`.
Each core also needs a \`designation\` string.

### Cable Wire BOM Entries

When using a cable, each core gets its own wire BOM entry keyed as \`C1.1\`, \`C1.2\`, etc.
These entries need a \`wireOverrides\` field with the color name:

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
    "wireOverrides": { "color": "red" }
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

## Examples — Copy-Paste Patterns

### Multi-Wire Harness with Signal Labels

Two 4-pin Deutsch DT connectors wired point-to-point with signal names:

\`\`\`json
{
  "name": "Sensor Cable Assembly",
  "is_public": false,
  "bom": {
    "X1": {
      "instance_id": "X1",
      "part": { "part_id": "SYNTHETIC-dt04-4p", "kind": "connector", "mpn": "DT04-4P", "manufacturer": "Deutsch", "description": "DT 4-Pin Receptacle", "spec": { "positions": 4, "contact_gender": "female", "series": "DT", "shape": "rectangular", "rows": 1 } },
      "unit": "each"
    },
    "X2": {
      "instance_id": "X2",
      "part": { "part_id": "SYNTHETIC-dt06-4s", "kind": "connector", "mpn": "DT06-4S", "manufacturer": "Deutsch", "description": "DT 4-Pin Plug", "spec": { "positions": 4, "contact_gender": "male", "series": "DT", "shape": "rectangular", "rows": 1 } },
      "unit": "each"
    },
    "W1": {
      "instance_id": "W1",
      "part": { "part_id": "SYNTHETIC-18awg-red", "kind": "wire", "mpn": "18 AWG Red", "manufacturer": "Generic", "spec": { "awg": 18, "color": "red", "conductor_type": "stranded" } },
      "unit": "m"
    },
    "W2": {
      "instance_id": "W2",
      "part": { "part_id": "SYNTHETIC-18awg-blk", "kind": "wire", "mpn": "18 AWG Black", "manufacturer": "Generic", "spec": { "awg": 18, "color": "black", "conductor_type": "stranded" } },
      "unit": "m"
    },
    "W3": {
      "instance_id": "W3",
      "part": { "part_id": "SYNTHETIC-22awg-grn", "kind": "wire", "mpn": "22 AWG Green", "manufacturer": "Generic", "spec": { "awg": 22, "color": "green", "conductor_type": "stranded" } },
      "unit": "m"
    },
    "W4": {
      "instance_id": "W4",
      "part": { "part_id": "SYNTHETIC-22awg-wht", "kind": "wire", "mpn": "22 AWG White", "manufacturer": "Generic", "spec": { "awg": 22, "color": "white", "conductor_type": "stranded" } },
      "unit": "m"
    }
  },
  "data": {
    "mapping": {
      "W1": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 1, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 1, "side": "right" },
        "label_end1": "12V", "label_end2": "12V", "length_mm": 500
      },
      "W2": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 2, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 2, "side": "right" },
        "label_end1": "GND", "label_end2": "GND", "length_mm": 500
      },
      "W3": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 3, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 3, "side": "right" },
        "label_end1": "CAN_H", "label_end2": "CAN_H", "length_mm": 500,
        "twisted_pair_id": "tp_can"
      },
      "W4": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 4, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 4, "side": "right" },
        "label_end1": "CAN_L", "label_end2": "CAN_L", "length_mm": 500,
        "twisted_pair_id": "tp_can"
      }
    },
    "connector_positions": { "X1": { "x": 100, "y": 200 }, "X2": { "x": 600, "y": 200 } },
    "wire_anchors": {}
  }
}
\`\`\`

**Key points:**
- W3 and W4 share the same \`twisted_pair_id\` — they render as a twisted pair
- Signal labels (\`label_end1\`/\`label_end2\`) appear on the schematic at each endpoint
- Wire gauge is a number (18), color is a name ("red") — NOT hex, NOT "18 AWG"

### Cable with Core Mappings

An 8-core cable connecting two connectors. Each core gets its own wire BOM entry (C1.1, C1.2, etc.) and mapping entry.

\`\`\`json
{
  "bom": {
    "X1": {
      "instance_id": "X1",
      "part": { "part_id": "SYNTHETIC-conn-8p", "kind": "connector", "mpn": "8-Pin Receptacle", "manufacturer": "Generic", "spec": { "positions": 8, "shape": "rectangular", "rows": 2 } },
      "unit": "each"
    },
    "X2": {
      "instance_id": "X2",
      "part": { "part_id": "SYNTHETIC-conn-8p", "kind": "connector", "mpn": "8-Pin Receptacle", "manufacturer": "Generic", "spec": { "positions": 8, "shape": "rectangular", "rows": 2 } },
      "unit": "each"
    },
    "C1": {
      "instance_id": "C1",
      "part": {
        "part_id": "SYNTHETIC-cat6-8core", "kind": "cable", "mpn": "Cat6 8-Core Purple", "manufacturer": "Generic",
        "description": "Cat6 8-core cable, purple jacket, 24 AWG",
        "spec": {
          "core_count": 8,
          "shielded": false,
          "jacket_color": "purple",
          "cores": [
            { "core_no": 1, "designation": "1", "core_color": "white", "stripe": "orange", "awg": 24 },
            { "core_no": 2, "designation": "2", "core_color": "orange", "awg": 24 },
            { "core_no": 3, "designation": "3", "core_color": "white", "stripe": "green", "awg": 24 },
            { "core_no": 4, "designation": "4", "core_color": "blue", "awg": 24 },
            { "core_no": 5, "designation": "5", "core_color": "white", "stripe": "blue", "awg": 24 },
            { "core_no": 6, "designation": "6", "core_color": "green", "awg": 24 },
            { "core_no": 7, "designation": "7", "core_color": "white", "stripe": "brown", "awg": 24 },
            { "core_no": 8, "designation": "8", "core_color": "brown", "awg": 24 }
          ]
        }
      },
      "unit": "m"
    },
    "C1.1": {
      "instance_id": "C1.1",
      "part": { "part_id": "SYNTHETIC-wire-c1-1", "kind": "wire", "mpn": "Core 1 (white/orange)", "manufacturer": "Generic", "spec": { "awg": 24, "color": "white", "stripe": "orange", "conductor_type": "stranded" } },
      "unit": "m",
      "wireOverrides": { "color": "white", "stripe": "orange" }
    },
    "C1.2": {
      "instance_id": "C1.2",
      "part": { "part_id": "SYNTHETIC-wire-c1-2", "kind": "wire", "mpn": "Core 2 (orange)", "manufacturer": "Generic", "spec": { "awg": 24, "color": "orange", "conductor_type": "stranded" } },
      "unit": "m",
      "wireOverrides": { "color": "orange" }
    }
  },
  "data": {
    "mapping": {
      "C1.1": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 1, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 1, "side": "right" }
      },
      "C1.2": {
        "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 2, "side": "left" },
        "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 2, "side": "right" }
      }
    },
    "connector_positions": { "X1": { "x": 100, "y": 200 }, "X2": { "x": 600, "y": 200 } },
    "cable_positions": { "C1": { "x": 350, "y": 200 } },
    "wire_anchors": {}
  }
}
\`\`\`

**Key points (cables are easy to get wrong):**
- Cable spec uses \`core_count\` (NOT \`cores: 8\`), \`jacket_color\` (NOT \`outer_color\`), and a \`cores\` array of objects
- Each core object needs \`core_no\`, \`designation\`, \`core_color\` (color **name**, e.g. \`"orange"\`), optional \`stripe\` (for striped pairs), and \`awg\`
- Each core MUST have its own wire BOM entry keyed \`C1.1\`, \`C1.2\`, etc. with \`wireOverrides: { color: "name", stripe?: "name" }\`
- Cable connections use \`connector_pin\` endpoints with \`C1.N\` as the mapping key — the key format associates the connection with the cable core
- Cable needs a position in \`cable_positions\` (separate from \`connector_positions\`)
- Only 2 cores shown for brevity — repeat the pattern for all cores

### Flying Lead with Terminal

A connector with one pin wired to a ring terminal flying lead:

\`\`\`json
{
  "W1": {
    "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 1, "side": "left" },
    "end2": { "type": "flying_lead", "termination_type": "bare", "terminal_instance": "T1" },
    "length_mm": 300
  }
}
\`\`\`

The \`terminal_instance\` references a terminal BOM entry (T1) — this is the ring/spade terminal attached to the wire end.

### Live Bridge — execute_commands Examples

#### Adding a fully-specified connector

**CRITICAL:** \`AddPartsCommand\` requires the \`part\` field with full specs. Without \`item.part\`, connectors default to 2-pin generic and wires default to 20 AWG red.

\`\`\`json
execute_commands({
  "commands": [
    {
      "command": "AddPartsCommand",
      "params": {
        "items": [{
          "kind": "connector",
          "mpn": "DT04-4P",
          "unit": "each",
          "part": {
            "id": "SYNTHETIC-dt04-4p",
            "kind": "connector",
            "mpn": "DT04-4P",
            "manufacturer": "Deutsch",
            "description": "DT Series 4-Pin Receptacle",
            "spec": { "positions": 4, "contact_gender": "female", "series": "DT", "shape": "rectangular", "rows": 1 }
          }
        }]
      }
    }
  ],
  "description": "Add DT04-4P connector"
})
\`\`\`

The \`item.part.spec\` must be **flat** format (fields directly on spec, NOT nested under spec.connector).

#### Wiring with full wire specs

\`BulkConnectionCommand\` accepts a \`wire\` field per connection with full wire specs. Without \`wire\`, auto-created wires default to 20 AWG red stranded.

\`\`\`json
execute_commands({
  "commands": [
    {
      "command": "BulkConnectionCommand",
      "params": {
        "connections": [{
          "end1": { "type": "connector_pin", "connector_instance": "X1", "pin": 1, "side": "left" },
          "end2": { "type": "connector_pin", "connector_instance": "X2", "pin": 1, "side": "right" },
          "wire": {
            "id": "SYNTHETIC-18awg-red",
            "kind": "wire",
            "mpn": "18 AWG Red",
            "manufacturer": "Generic",
            "spec": { "awg": 18, "color": "red", "conductor_type": "stranded" }
          }
        }]
      }
    }
  ],
  "description": "Wire X1.1 to X2.1 with 18 AWG red"
})
\`\`\`

#### Complete workflow — add parts, wire, and arrange

\`\`\`
Batch 1: AddPartsCommand (connectors + wires with full specs)
         + BulkConnectionCommand (with wire specs)
Batch 2: AutoArrangeCommand or AutoRouteCommand (MUST be separate batch)
Batch 3: getSummary to verify
\`\`\`

**AutoRouteCommand / AutoArrangeCommand cannot be batched** with AddPartsCommand or BulkConnectionCommand — they depend on established state. Always run layout commands in a separate \`execute_commands\` call.

**Batch error behavior:** If a command fails mid-batch, prior commands may have already applied. The batch does NOT rollback. Check \`getSummary\` after any error.

**Instance keys:** \`AddPartsCommand\` auto-generates the next available key (X3 if X1 and X2 exist). Call \`getSummary\` after adding parts to confirm assigned keys before referencing them.

## Live Bridge (Assembly Mode)

When a harness/assembly is open in the browser with the Agent Bridge enabled, you can make real-time edits via the WebSocket bridge. Use the \`assembly-live\` prompt or manually target the \`harness:<uuid>\` namespace.

### Queries

Use \`get_live_state\` with namespace \`harness:<uuid>\`:

| Query | Returns |
|-------|---------|
| \`getData\` | Full live state: \`bom\`, \`mapping\`, \`connector_positions\`, \`cable_positions\`, \`wire_anchors\`, \`design_notes\`, \`name\`, \`harness_id\` |
| \`getSummary\` | Counts: \`part_count\`, \`connector_count\`, \`wire_count\`, \`cable_count\`, \`connection_count\`, \`design_note_count\`, \`name\`, \`harness_id\` |
| \`canUndo\` | \`{ canUndo: boolean }\` |
| \`canRedo\` | \`{ canRedo: boolean }\` |

### Commands

Use \`execute_command\` / \`execute_commands\` with namespace \`harness:<uuid>\`. Key commands:

**Part management:**
- \`AddPartsCommand\` — \`{ items: [{ part_id, unit, ... }], viewportState? }\`
- \`DeletePartsCommand\` — \`{ keys: ["X1", "W2", ...] }\`

**Connections:**
- \`BulkConnectionCommand\` — \`{ connections: [{ end1: ConnectionTermination, end2: ConnectionTermination, wire?: WirePart }] }\`
- \`AddConnectionCommand\` — \`{ end1, end2, wire?, unit? }\`
- \`RemoveConnectionCommand\` — \`{ connectionKey: "W1" }\`

**Edit parts:**
- \`EditConnectorCommand\` — \`{ partKey: "X1", newPartData: { ... } }\`
- \`EditWireCommand\` — \`{ partKey: "W1", newPartData: { ... } }\`
- \`EditCableCommand\` — \`{ partKey: "C1", newPartData: { ... } }\`

**Layout:**
- \`BulkMoveCommand\` — \`{ selectedItems, deltaX, deltaY }\`
- \`AutoArrangeCommand\` — \`{ selectedItems, gridSpacing? }\`
- \`AlignCommand\` — \`{ direction, selectedItems, gridSpacing? }\`

**Swap:**
- \`SwapConnectorCommand\` / \`SwapWireCommand\` / \`SwapCableCommand\` — \`{ swapData: { partKey, newPartId, newMpn } }\`

**Labels:**
- \`UpdateSignalLabelCommand\` — \`{ wireKey, oldLabel, newLabel }\`
- \`AddBundleLabelCommand\` — \`{ label: BundleLabel }\`

**Delete specific types:**
- \`DeleteWireCommand\` — \`{ wireKey }\`
- \`DeleteCableCommand\` — \`{ cableKey }\`
- \`DeleteConnectorCommand\` — \`{ connectorKey }\`

### ConnectionTermination format

\`\`\`json
{ "type": "connector_pin", "connector_instance": "X1", "pin": 1, "side": "left" }
{ "type": "cable_core", "cable_instance": "C1", "core_no": 1, "side": "left" }
{ "type": "flying_lead", "termination_type": "tinned" }
\`\`\`

### Workflow

1. \`is_bridge_connected\` — look for \`harness:<uuid>\` namespace
2. \`get_live_state({ query: "getSummary" })\` — understand current state
3. \`get_live_state({ query: "getData" })\` — full BOM/connections if needed
4. Batch changes with \`execute_commands\` — always prefer batching
5. Verify with \`getSummary\` after changes
6. \`undo\` / \`redo\` work on the harness command history
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
