import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const PLAN_DATA_SCHEMA = `# Splice PlanData Schema Reference

Use this schema to construct valid PlanData JSON for the \`save_plan\` tool.

## Recommended Workflow

1. **Get part info from the user or research it yourself** — use web search, datasheets, or the user's description to get MPN, manufacturer, pin count, and pin labels. Do NOT default to searching the Splice parts database.
2. **Create BOM entries directly** — put MPN, manufacturer, and specs right in the plan JSON. No database lookup needed.
3. **Build the plan** — create nodes, links, conductors, nets. Assign BOM entries to nodes.
4. **Save** — use \`save_plan\` to write it. Use \`get_plan_summary\` to verify.

Only use \`search_connectors\`/\`search_wires\`/\`search_cables\` when the user explicitly asks to find a part in the database, or when you need to discover available parts.

## Performance: Batch Commands

When using the WebSocket bridge (\`execute_command\` / \`execute_commands\`), **always batch operations into a single \`execute_commands\` call**. Each tool call has round-trip overhead — batching is 10-50x faster.

**BAD — 5 separate tool calls (slow):**
\`\`\`
execute_command("AddNodeCommand", { node: ... })
execute_command("AddBomEntryCommand", { entry: ... })
execute_command("AssignBomToNodeCommand", { nodeId: ..., bomEntryId: ... })
execute_command("AddLinkCommand", { link: ... })
execute_command("AddNewConductorCommand", { conductor: ... })
\`\`\`

**GOOD — 1 batched call (fast):**
\`\`\`
execute_commands([
  { command: "AddNodeCommand", params: { node: ... } },
  { command: "AddBomEntryCommand", params: { entry: ... } },
  { command: "AssignBomToNodeCommand", params: { nodeId: ..., bomEntryId: ... } },
  { command: "AddLinkCommand", params: { link: ... } },
  { command: "AddNewConductorCommand", params: { conductor: ... } }
], description: "Add connector X1 with wiring")
\`\`\`

Batched commands also undo atomically — one Ctrl+Z undoes the entire batch.

## Quick Start — Minimal Valid Plan

\`\`\`json
{
  "nodes": {
    "comp_1": {
      "id": "comp_1",
      "type": "component",
      "position": { "x": 100, "y": 300 },
      "label": "X1",
      "name": "ECU Connector",
      "pins": [
        { "id": "pin_1", "label": "1" },
        { "id": "pin_2", "label": "2" },
        { "id": "pin_3", "label": "3" },
        { "id": "pin_4", "label": "4" }
      ]
    },
    "comp_2": {
      "id": "comp_2",
      "type": "component",
      "position": { "x": 500, "y": 300 },
      "label": "X2",
      "name": "Sensor",
      "pins": [
        { "id": "pin_5", "label": "1" },
        { "id": "pin_6", "label": "2" }
      ]
    }
  },
  "links": {
    "link_1": {
      "id": "link_1",
      "sourceNodeId": "comp_1",
      "targetNodeId": "comp_2",
      "length_mm": 500
    }
  },
  "conductors": {
    "cond_1": {
      "id": "cond_1",
      "netName": "net_power",
      "gauge": "18 AWG",
      "color": "#FF0000",
      "stripe": "#FFFFFF",
      "startEndpoint": { "nodeId": "comp_1", "pinId": "pin_1" },
      "endEndpoint": { "nodeId": "comp_2", "pinId": "pin_5" },
      "linkPath": ["link_1"]
    },
    "cond_2": {
      "id": "cond_2",
      "netName": "net_ground",
      "gauge": "18 AWG",
      "color": "#000000",
      "startEndpoint": { "nodeId": "comp_1", "pinId": "pin_2" },
      "endEndpoint": { "nodeId": "comp_2", "pinId": "pin_6" },
      "linkPath": ["link_1"]
    }
  },
  "nets": {
    "net_power": { "name": "net_power", "displayName": "12V Power" },
    "net_ground": { "name": "net_ground", "displayName": "GND" }
  },
  "wireGroups": {},
  "cables": {},
  "signals": {},
  "mates": [],
  "deviceGroups": [],
  "conductorSplices": {},
  "assemblyRefs": {},
  "bom": []
}
\`\`\`

## ID Format Rules

All entity IDs must use these prefixes. Use timestamp + random suffix for uniqueness.

| Entity | Prefix | Example |
|--------|--------|---------|
| Component node | \`comp_\` | \`comp_1734567890_abc123def\` |
| Branch point node | \`bp_\` | \`bp_1734567890_abc123def\` |
| Link (bundle) | \`link_\` | \`link_1734567890_abc123def\` |
| Conductor (wire) | \`cond_\` | \`cond_1734567890_abc123def\` |
| Pin | \`pin_\` | \`pin_1734567890_abc123def\` |
| Cable | \`cable_\` | \`cable_1734567890_abc123def\` |
| Wire group | \`wg_\` | \`wg_1734567890_abc123def\` |
| BOM entry | \`bom_\` | \`bom_1734567890_abc123def\` |
| Conductor splice | \`cs_\` | \`cs_1734567890_abc123def\` |
| Mate relationship | \`mate_\` | \`mate_1734567890_abc123def\` |
| Signal | \`sig_\` | \`sig_1734567890_abc123def\` |
| Page | \`page_\` | \`page_1734567890_abc123def\` |

For simplicity, you can use shorter IDs like \`comp_1\`, \`link_1\`, etc. — just keep them unique within the plan.

## Standard Wire Colors

Splice uses a fixed set of 11 standard wire colors. **Always use these exact hex values for conductor colors/stripes in PlanData, and these exact names for BOM entry specs.**

| Name | Hex | Use in PlanConductor | Use in BomEntrySpec |
|------|-----|---------------------|---------------------|
| black | \`#000000\` | \`color: "#000000"\` | \`color: "black"\` |
| brown | \`#A52A2A\` | \`color: "#A52A2A"\` | \`color: "brown"\` |
| red | \`#FF0000\` | \`color: "#FF0000"\` | \`color: "red"\` |
| orange | \`#FFA500\` | \`color: "#FFA500"\` | \`color: "orange"\` |
| yellow | \`#FFFF00\` | \`color: "#FFFF00"\` | \`color: "yellow"\` |
| green | \`#00FF00\` | \`color: "#00FF00"\` | \`color: "green"\` |
| blue | \`#0000FF\` | \`color: "#0000FF"\` | \`color: "blue"\` |
| violet | \`#8A2BE2\` | \`color: "#8A2BE2"\` | \`color: "violet"\` |
| gray | \`#808080\` | \`color: "#808080"\` | \`color: "gray"\` |
| white | \`#FFFFFF\` | \`color: "#FFFFFF"\` | \`color: "white"\` |
| pink | \`#FFC0CB\` | \`color: "#FFC0CB"\` | \`color: "pink"\` |

**IMPORTANT**:
- \`PlanConductor.color\` and \`PlanConductor.stripe\` use **hex values** (e.g. \`"#FF0000"\`)
- \`BomEntrySpec.color\` and \`BomEntrySpec.stripe\` use **color names** (e.g. \`"red"\`)
- Do NOT use arbitrary hex values — only the 11 standard colors above
- The same rule applies to stripe colors

## Standard Wire Gauges

Use AWG format as a string: \`"8 AWG"\`, \`"10 AWG"\`, \`"12 AWG"\`, \`"14 AWG"\`, \`"16 AWG"\`, \`"18 AWG"\`, \`"20 AWG"\`, \`"22 AWG"\`, \`"24 AWG"\`, \`"26 AWG"\`, \`"28 AWG"\`, \`"30 AWG"\`.

## PlanData (root)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nodes | Record<string, PlanNode> | YES | Components and branch points |
| links | Record<string, PlanLink> | YES | Bundle connections between nodes |
| conductors | Record<string, PlanConductor> | no | Wire entities |
| conductorSplices | Record<string, ConductorSplice> | no | Junctions at branch points |
| wireGroups | Record<string, PlanWireGroup> | YES | Twisted/bundled wire groups |
| cables | Record<string, PlanCable> | YES | Multi-conductor cables |
| signals | Record<string, PlanSignalDefinition> | no | Signal type definitions |
| nets | Record<string, PlanNet> | no | Named nets with display names |
| mates | MateRelationship[] | no | Connector mating pairs |
| deviceGroups | DeviceGroup[] | no | Physical device containers |
| bom | BomEntry[] | no | Bill of materials |
| assemblyRefs | Record<string, PlanAssemblyRef> | no | Off-the-shelf assemblies |

Initialize empty collections as \`{}\` for records and \`[]\` for arrays.

## PlanNode

\`\`\`typescript
{
  id: string;                    // "comp_xxx" or "bp_xxx"
  type: "component" | "branch_point";
  position: { x: number; y: number };
  label: string;                 // Designator: "X1", "J2", "F1", "BP1"
  name?: string;                 // Descriptive: "ECU Connector", "Main Fuse"
  category?: string;             // undefined = connector. Valid categories:
                                 // "circuit_breaker", "fuse", "relay", "contactor",
                                 // "switch", "push_button", "motor", "pcb",
                                 // "power_supply", "battery", "diode", "fan",
                                 // "timer", "inductor", "capacitor", "resistor",
                                 // "transformer", "solar_cell", "inverter",
                                 // "flying_lead", "splice", "terminal_point", "other"
  pins?: ComponentPin[];         // Components only
  shape?: ConnectorShape;        // Connectors only: "rectangular"|"circular"|"dsub"|"header"
  size?: { width: number; height: number };  // See default sizes below
  bomEntryId?: string;           // Reference to BOM entry
  hideEmptyPins?: boolean;
}
\`\`\`

### Default Node Sizes

If \`size\` is omitted, the default depends on the node type:

| Node type | Default width | Default height |
|-----------|--------------|----------------|
| Component (connector, fuse, relay, etc.) | 100 | 50 |
| Terminal point (\`terminal_block\` shape) | 100 | 50 |
| Termination (\`ferrule\`, \`ring\`, \`quickdisconnect\`) | 40 | 10 |
| Flying lead (\`category: "flying_lead"\`) | 40 | 10 |
| Branch point | 20 (circle, radius 10) | 20 |

Termination and flying lead nodes are intentionally compact — they represent small wire-end components. You generally don't need to set \`size\` unless you want to override the defaults.

### ComponentPin

\`\`\`typescript
{
  id: string;         // "pin_xxx"
  label: string;      // "1", "2", "A", "GND"
  function?: string;  // "Power", "Ground", "CAN_H"
  detail?: string;    // "24V, 2A max"
}
\`\`\`

### Designator Conventions

Designators are auto-generated from the node category. Use these prefixes in the \`label\` field:

| Category | Prefix | Example |
|----------|--------|---------|
| (default connector) | X | X1, X2 |
| terminal_point | X | X3 (same as connectors) |
| fuse | F | F1, F2 |
| circuit_breaker | CB | CB1 |
| relay / contactor | K | K1, K2 |
| switch | S | S1 |
| push_button | PB | PB1 |
| motor | M | M1 |
| battery | BT | BT1 |
| diode | D | D1 |
| power_supply | PS | PS1 |
| pcb | PCB | PCB1 |
| flying_lead | FL | FL1 |
| splice | SP | SP1 |
| fan | FAN | FAN1 |
| timer | TM | TM1 |
| inductor | L | L1 |
| capacitor | CAP | CAP1 |
| resistor | R | R1 |
| transformer | T | T1 |
| solar_cell | PV | PV1 |
| inverter | INV | INV1 |
| other | X | X4 |
| (branch point node) | BP | BP1, BP2 |

### Mating & Termination System

Every component node has a **mating behavior** determined by its \`shape\` and \`category\`. This controls what it can mate with.

#### Three Mating Behaviors

| Behavior | Default inference | What it does |
|----------|------------------|-------------|
| **Connector** (\`"connector"\`) | \`shape\`: \`rectangular\`, \`circular\`, \`dsub\`, \`button\`, \`other\` (or no shape) | Mates inline with another connector |
| **Terminal Point** (\`"terminal_point"\`) | \`shape\`: \`terminal_block\` | Receives terminations at its positions |
| **Termination** (\`"termination"\`) | \`shape\`: \`ferrule\`, \`ring\`, \`quickdisconnect\` — OR — \`category: "flying_lead"\` | Connects to a terminal point position |

The mating behavior is **inferred** from shape and category by default, but can be **overridden** on any node using \`matingBehavior\`:

\`\`\`json
{
  "id": "comp_1", "type": "component", "label": "X1",
  "shape": "rectangular",
  "matingBehavior": "terminal_point"
}
\`\`\`

This makes a rectangular-shaped component behave as a terminal point regardless of its shape. Valid values: \`"connector"\`, \`"terminal_point"\`, \`"termination"\`. Use this when the default inference doesn't match the real-world component.

#### Mating Rules

| Component A | Component B | Can mate? |
|------------|-------------|-----------|
| Connector | Connector | YES — use \`MateRelationship\` with \`pinMappings\` |
| Termination | Terminal Point | YES — use \`MateRelationship\` with \`mateType: "device"\` |
| Terminal Point | Terminal Point | NO |
| Termination | Termination | NO |
| Connector | Terminal Point | NO |
| Connector | Termination | NO |

#### How to Model Common Real-World Components

| Real-world component | Model as | Shape | Category |
|---------------------|----------|-------|----------|
| Deutsch DT, Molex, JST, D-Sub | Connector node | \`rectangular\`, \`circular\`, \`dsub\` | (omit) |
| Terminal block, barrier strip | Terminal point node | \`terminal_block\` | \`"terminal_point"\` |
| Stud terminal, ground stud, battery post | Terminal point node | \`terminal_block\` | \`"terminal_point"\` |
| Bus bar, DIN rail terminal | Terminal point node | \`terminal_block\` | \`"terminal_point"\` |
| Ferrule (wire end-treatment) | Termination node | \`ferrule\` | (omit) |
| Ring terminal | Termination node | \`ring\` | (omit) |
| Quick disconnect / spade | Termination node | \`quickdisconnect\` | (omit) |
| Bare / tinned wire end | Termination node | — | \`"flying_lead"\` |
| Fuse | Connector node | — | \`"fuse"\` |
| Relay | Connector node | — | \`"relay"\` |
| Circuit breaker | Connector node | — | \`"circuit_breaker"\` |

#### Contacts on Conductor Endpoints

In addition to termination nodes, you can specify the **contact part** (crimp pin, ferrule, etc.) used where a wire meets a connector or terminal point. This is done via \`startTermination\` / \`endTermination\` on the conductor:

\`\`\`json
"endTermination": { "method": "crimp", "contactBomEntryId": "bom_ferrule_1" }
\`\`\`

The contact is a BOM entry with \`type: "contact"\`. This specifies the physical part used to attach the wire — separate from the termination node shape.

#### Example: ECU connector → terminal block (with termination node + contact parts)

\`\`\`json
{
  "nodes": {
    "comp_ecu": {
      "id": "comp_ecu", "type": "component", "label": "X1", "name": "ECU",
      "position": { "x": 100, "y": 300 },
      "shape": "rectangular",
      "pins": [{ "id": "pin_1", "label": "1", "function": "12V Power" }]
    },
    "comp_tb": {
      "id": "comp_tb", "type": "component", "label": "TP1",
      "name": "Power Terminal Block",
      "category": "terminal_point",
      "shape": "terminal_block",
      "position": { "x": 500, "y": 300 },
      "pins": [{ "id": "pin_tb1", "label": "1" }]
    }
  },
  "links": {
    "link_1": {
      "id": "link_1",
      "sourceNodeId": "comp_ecu", "targetNodeId": "comp_tb",
      "length_mm": 300
    }
  },
  "conductors": {
    "cond_1": {
      "id": "cond_1", "netName": "net_pwr",
      "gauge": "16 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "comp_ecu", "pinId": "pin_1" },
      "endEndpoint": { "nodeId": "comp_tb", "pinId": "pin_tb1" },
      "linkPath": ["link_1"],
      "startTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp_1" },
      "endTermination": { "method": "crimp", "contactBomEntryId": "bom_ferrule_1" }
    }
  },
  "bom": [
    { "id": "bom_ferrule_1", "mpn": "AI 1.5-8 RD", "manufacturer": "Phoenix Contact",
      "type": "contact", "description": "Ferrule 16 AWG Red" },
    { "id": "bom_crimp_1", "mpn": "0460-215-1631", "manufacturer": "Deutsch",
      "type": "contact", "description": "Size 16 Crimp Contact" }
  ],
  "nets": {
    "net_pwr": { "name": "net_pwr", "displayName": "12V Power" }
  },
  "wireGroups": {}, "cables": {}, "signals": {}, "mates": [],
  "deviceGroups": [], "conductorSplices": {}, "assemblyRefs": {}
}
\`\`\`

## PlanLink (bundle)

\`\`\`typescript
{
  id: string;                    // "link_xxx"
  sourceNodeId: string;          // Source node ID
  targetNodeId: string;          // Target node ID
  length_mm?: number;            // Bundle length in mm
  length_tolerance_mm?: number;  // +/- symmetric tolerance
  pathStyle?: "orthogonal" | "straight";
}
\`\`\`

## PlanConductor (wire)

A conductor is a single wire with exactly 2 endpoints.

\`\`\`typescript
{
  id: string;                    // "cond_xxx"
  netName: string;               // Key into nets record (opaque, not user-facing)
  gauge?: string;                // "18 AWG", "22 AWG" — use standard gauges only
  color?: string;                // Hex from standard colors ONLY (e.g. "#FF0000" for red)
  stripe?: string;               // Hex from standard colors ONLY (e.g. "#FFFFFF" for white)
  voltage?: number;              // Operating voltage
  current?: number;              // Expected current (amps)
  startEndpoint: {
    nodeId: string;              // Node ID
    pinId?: string;              // Pin ID (omit for branch points)
  };
  endEndpoint: {
    nodeId: string;
    pinId?: string;
  };
  linkPath: string[];            // Ordered link IDs from start to end
  bomEntryId?: string;           // Wire type BOM entry
  startTermination?: { method?: "crimp"|"solder"|"idc"; contactBomEntryId?: string };
  endTermination?: { method?: "crimp"|"solder"|"idc"; contactBomEntryId?: string };
}
\`\`\`

**Important**: \`netName\` is an opaque key (never shown to users). Generate unique names like \`NET_1\`, \`NET_2\`, or \`NET_<timestamp>_<counter>\`. Each conductor gets its own netName unless multiple conductors share the same electrical net (e.g., conductors on either side of a branch point splice). Create a corresponding entry in \`nets\` with a \`displayName\` for the user-visible label.

**Important**: \`linkPath\` must list the link IDs in order from startEndpoint to endEndpoint. For a direct connection between two components, this is a single link ID. For a conductor from node A to node C through branch point B, linkPath must be \`["link_A_B", "link_B_C"]\` — the links must form a connected path through the topology graph.

**Pigtail lead inheritance**: If \`gauge\`, \`color\`, and \`stripe\` are all omitted on a conductor, and either endpoint pin has a \`lead\` property (pigtail component), the conductor inherits wire properties from that lead automatically.

## PlanNet

\`\`\`typescript
{
  name: string;           // Same as the key in nets record
  signalId?: string;      // Reference to a signal definition
  displayName?: string;   // User-visible name: "12V Power", "CAN_H", "GND"
  color?: string;         // Override color (hex)
}
\`\`\`

## ConductorSplice

Defines electrical connections where conductors meet at a branch point.

\`\`\`typescript
{
  id: string;                // "cs_xxx"
  designator: string;        // "SP1", "SP2"
  branchPointId: string;     // Branch point node ID
  conductorIds: string[];    // 2+ conductor IDs meeting here
  spliceType?: "butt"|"y"|"closed_end"|"ultrasonic"|"solder"|"crimp"|"tap";
  splicePartName?: string;
}
\`\`\`

## PlanWireGroup

Group conductors on a single link into a twisted pair or bundle.

\`\`\`typescript
{
  id: string;              // "wg_xxx"
  linkId: string;          // Must reference a single link
  method: "twisted" | "bundled";
  conductorIds: string[];  // Conductor IDs in this group
  name?: string;
  twistPitchMm?: number;
}
\`\`\`

## PlanCable

Map conductors to a multi-conductor cable on a single link.

\`\`\`typescript
{
  id: string;              // "cable_xxx"
  linkId: string;          // Must reference a single link
  cableName: string;       // Cable description
  coreMappings: Array<{
    coreNumber: number;
    conductorId?: string;  // Conductor mapped to this core
  }>;
  bomEntryId?: string;
  shielded?: boolean;
}
\`\`\`

## BomEntry (Bill of Materials)

Every real-world part in the harness (connectors, wires, contacts, cables) is tracked as a BomEntry. Nodes and conductors reference BOM entries via \`bomEntryId\`.

\`\`\`typescript
{
  id: string;              // "bom_xxx"
  mpn: string;             // Manufacturer Part Number (e.g. "DT04-4P", "43025-0400")
  manufacturer: string;    // Manufacturer name (e.g. "Deutsch", "Molex")
  description?: string;    // Human-readable description
  type: "connector"|"cable"|"wire"|"contact"|"splice"|"covering"|"assembly"|"other";
  spec?: BomEntrySpec;     // Type-specific specs (see below)
  sourcePartId?: string;   // Splice DB part ID (if created from search results)
  datasheet_url?: string;  // URL to datasheet
  img_url?: string;        // URL to part image
}
\`\`\`

### BomEntrySpec (type-specific fields)

\`\`\`typescript
{
  // Connector specs
  positions?: number;      // Pin/position count
  gender?: "male"|"female";
  series?: string;         // Connector series (e.g. "DT", "Micro-Fit 3.0")
  shape?: string;          // ConnectorShape for display
  category?: string;       // Component category
  pin_labels?: string[];   // Ordered pin labels (e.g. ["A","B","C","D"])
  pin_functions?: (string|undefined)[];  // Ordered pin functions

  // Wire specs
  gauge?: string;          // "18 AWG"
  color?: string;          // Color NAME (black, red, etc.) — NOT hex
  stripe?: string;         // Stripe color NAME

  // Cable specs
  conductorCount?: number;
  shielded?: boolean;
  cores?: Array<{ core_no: number; color?: string; stripe?: string; awg?: number }>;
}
\`\`\`

### How to Assign Parts to Components

**Preferred: Create BOM entries directly from known specs**

When the user provides a part number, manufacturer, or datasheet — create a BomEntry directly. Do NOT search the database first. You already have the information you need.

\`\`\`json
{
  "id": "bom_1",
  "mpn": "DT04-4P",
  "manufacturer": "Deutsch",
  "description": "DT Series 4-Pin Receptacle",
  "type": "connector",
  "spec": { "positions": 4, "gender": "female", "series": "DT" }
}
\`\`\`

Set \`bomEntryId: "bom_1"\` on the node. That's it — no database lookup needed.

Optionally use \`create_component\` to save the part to the database for future reuse, but this is not required for the plan to work.

**Only search when you don't have specs**

Use \`search_connectors\`, \`search_wires\`, or \`search_cables\` only when:
- The user says "find me a 4-pin connector" without specifying a part number
- You need to discover what's available in the database
- You want to match an existing part for its \`sourcePartId\`

If you search and find a match, copy its fields into a BomEntry and set \`sourcePartId\` to link it back:

\`\`\`json
{
  "id": "bom_2",
  "mpn": "DT04-4P",
  "manufacturer": "Deutsch",
  "type": "connector",
  "sourcePartId": "a1b2c3d4-...",
  "spec": { "positions": 4, "gender": "female", "series": "DT" }
}
\`\`\`

**From a datasheet or user description**

When the user provides a datasheet or describes a part, create the BomEntry directly from that information:

\`\`\`json
{
  "id": "bom_3",
  "mpn": "1-770178-1",
  "manufacturer": "TE Connectivity",
     "description": "4-pos AMP Superseal receptacle",
     "type": "connector",
     "spec": { "positions": 4, "gender": "female" },
     "datasheet_url": "https://www.te.com/..."
   }
   \`\`\`
3. Set \`bomEntryId: "bom_2"\` on the node

### What Gets a BomEntry

| Element | BomEntry type | What it represents |
|---------|--------------|-------------------|
| Component node | \`"connector"\` | The connector housing / component body |
| Conductor | \`"wire"\` | The wire type (gauge, color, insulation) |
| Conductor endpoint | \`"contact"\` | The crimp pin, ferrule, or ring terminal at one end |
| Cable on a link | \`"cable"\` | The multi-conductor cable jacket |
| Conductor splice | \`"splice"\` | The splice hardware (butt splice, solder sleeve, etc.) |

### MPN and Manufacturer Guidelines

- **mpn** should be the exact manufacturer part number as it appears on the datasheet or distributor listing (e.g. \`"DT04-4P"\`, \`"43025-0400"\`, \`"AI 1.5-8 RD"\`)
- **manufacturer** should be the full manufacturer name (e.g. \`"Deutsch"\`, \`"Molex"\`, \`"Phoenix Contact"\`, \`"TE Connectivity"\`)
- If the exact MPN is unknown, use a descriptive placeholder (e.g. \`mpn: "4-pin rectangular female"\`) and set \`manufacturer: "Generic"\`
- For wires without a specific part: \`mpn: "18 AWG Red"\`, \`manufacturer: "Generic"\`
- Always set \`spec.positions\` for connectors so Splice can validate pin counts

### BOM Assignment Behavior

When you assign a BOM entry to a node (set \`bomEntryId\`), you should also sync the node to match the part:

1. **Set \`shape\` and \`category\`** from \`spec.shape\` and \`spec.category\` on the node
2. **Create pins** from \`spec.positions\` and \`spec.pin_labels\` if the node has no pins yet
3. **Set \`bridged_positions\`** from \`spec.bridged_positions\` if present

This ensures the node's visual representation and pin count match the assigned part. In the Splice UI, the AssignBomToNodeCommand handles this automatically — when building raw JSON, you must do it manually.

## MateRelationship

A mate relationship declares that two components physically connect to each other. This is separate from wiring — mates define the **physical connection between housings/bodies**, while conductors define the **electrical connections between pins**.

\`\`\`typescript
{
  id: string;              // "mate_xxx"
  connector1Id: string;    // PlanNode ID (first component)
  connector2Id: string;    // PlanNode ID (second component)
  notes?: string;          // Free-text notes about the mate
  pinMappings?: Array<{    // Which pins on each side correspond
    pin1Id: string;        // Pin ID on connector1
    pin2Id: string;        // Pin ID on connector2
  }>;
}
\`\`\`

### Pin Mappings

Pin mappings define which pin on connector1 corresponds to which pin on connector2. This is important for:
- Verifying that wiring between mated connectors is correct
- Generating mating diagrams in documentation
- Detecting cross-wiring errors

\`\`\`json
"pinMappings": [
  { "pin1Id": "pin_1", "pin2Id": "pin_5" },
  { "pin1Id": "pin_2", "pin2Id": "pin_6" },
  { "pin1Id": "pin_3", "pin2Id": "pin_7" }
]
\`\`\`

**Auto-generation rules** (when \`pinMappings\` is omitted):
- If both connectors have exactly 1 pin, they auto-map to each other
- If both have multiple pins, they map by matching pin \`label\` values (e.g., pin labeled "1" on connector1 maps to pin labeled "1" on connector2)
- Only pins with matching labels are mapped — unmatched pins are left unmapped

It is generally better to specify \`pinMappings\` explicitly rather than relying on auto-generation.

### Mating Compatibility

A MateRelationship is only valid between nodes whose **mating behaviors** are compatible (see Mating & Termination System above):

- **Connector ↔ Connector**: valid
- **Termination ↔ Terminal Point**: valid
- All other combinations: invalid

### Example: Mating two connectors

\`\`\`json
{
  "mates": [
    {
      "id": "mate_1",
      "connector1Id": "comp_plug",
      "connector2Id": "comp_receptacle",
      "mateType": "inline",
      "pinMappings": [
        { "pin1Id": "pin_1", "pin2Id": "pin_4" },
        { "pin1Id": "pin_2", "pin2Id": "pin_5" }
      ]
    }
  ]
}
\`\`\`

## Key Constraints

1. **Conductors have exactly 2 endpoints** — start and end. For multi-segment paths, set linkPath to multiple link IDs.
2. **Wire groups and cables are scoped to a single link** — no branching.
3. **Branch points have no pins** — conductor endpoints at branch points omit pinId.
4. **netName must have a corresponding PlanNet entry** for display names.
5. **linkPath must be contiguous** — the links must form a connected path from startEndpoint.nodeId to endEndpoint.nodeId.
6. **All referenced IDs must exist** — node IDs in links, pin IDs in conductors, link IDs in linkPath, etc.
7. **Assembly locks** — nodes and links with \`assemblyRefId\` set belong to an off-the-shelf assembly and cannot be structurally modified. Do not add/remove conductors on locked links or modify locked nodes.
8. **Pages are optional** — if \`pages\` is empty or omitted, Splice auto-creates a default Page 1 on load. Page assignments (\`nodePageAssignments\`, \`linkPageAssignments\`) are optional — all nodes/links appear on all pages by default.
9. **Terminal point wiring pattern** — when wiring a connector to a terminal point, the recommended pattern is to create a ferrule intermediary node (\`shape: "ferrule"\`, size 40x10) between them. The connector links to the ferrule, and the ferrule mates with the terminal point via a \`MateRelationship\`. This matches what the Splice UI does automatically.
10. **BOM and node must stay in sync** — when setting \`bomEntryId\` on a node, also set the node's \`shape\`, \`category\`, pin count, and pin labels to match the BOM entry's spec. See "BOM Assignment Behavior" above.
`;

const COMPONENT_CREATOR_SCHEMA = `# Component Creator Schema Reference

Use this schema with \`get_live_state({ query: "setComponentState", params: {...} })\` to create connectors with SVG graphics.

## Workflow

1. \`lookup_part({ mpn })\` — Get image, datasheet, specs from DigiKey
2. \`get_live_state({ query: "setComponentState", params })\` — Push form + spec + SVG
3. \`get_live_state({ query: "getComponentState" })\` — Verify state
4. \`get_live_state({ query: "getSvgElements" })\` — Read full SVG detail

## setComponentState params

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
    "gender": "male|female|none",
    "shape": "rectangular|circular|dsub|terminal_block|other",
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
    "elements": { /* SvgElements — see below */ },
    "pins": [ /* Pin array — see below */ ]
  }
}
\`\`\`

## SVG Element Types

Coordinates can be negative — (0,0) is a valid center point.

### RectangleElement
\`{ id, type: "rectangle", x, y, width, height, cornerRadius?, thickness, color, strokeColor, fill, visible, layer, rotation, mirrorX?, mirrorY? }\`

### CircleElement
\`{ id, type: "circle", cx, cy, r, thickness, color, strokeColor, fill, visible, layer, rotation }\`
**IMPORTANT:** Circles use \`cx\`, \`cy\`, \`r\` — NOT \`x\`, \`y\`, \`radius\`.

### PolygonElement
\`{ id, type: "polygon", points: [{x,y}...], cornerRadius, closed: true, thickness, color, strokeColor, fill, visible, layer, rotation }\`

### LineElement
\`{ id, type: "line", x1, y1, x2, y2, thickness, color, strokeColor, visible, layer }\`

### PathElement
\`{ id, type: "path", points: [{x,y}...], closed, thickness, color, strokeColor, visible, layer }\`

### SvgElements container
\`\`\`json
{
  "rectangles": [], "circles": [], "polygons": [],
  "lines": [], "paths": [],
  "malePins": [], "femalePins": [],
  "texts": [], "customSvgs": [], "images": []
}
\`\`\`

## Pin placement

Pins are separate from SVG elements. Use \`x\`, \`y\`, \`radius\` (NOT \`cx\`/\`cy\`/\`r\`).
\`\`\`json
{ "pinNumber": "1", "x": -100, "y": -25, "radius": 8, "gender": "male" }
\`\`\`

## Layer ordering
- 0: background (body, flange)
- 1: mid (shield, outline)
- 2: foreground (inner cavity)
- 3: details (keyway, notch)

## Examples

### DB-25 D-Sub (trapezoid polygon, staggered pins)
\`\`\`json
{
  "svg": {
    "clear": true,
    "elements": {
      "rectangles": [
        {"id": "body", "type": "rectangle", "x": -135, "y": -42.5, "width": 310, "height": 52.5, "cornerRadius": 2, "fill": "#707070", "color": "#333333", "strokeColor": "#333333", "thickness": 1, "visible": true, "layer": 0}
      ],
      "circles": [
        {"id": "screw1", "type": "circle", "cx": -125, "cy": -15, "r": 5.59, "fill": "#ffffff", "color": "#333333", "strokeColor": "#333333", "thickness": 1, "visible": true, "layer": 0},
        {"id": "screw2", "type": "circle", "cx": 165, "cy": -15, "r": 5.59, "fill": "#ffffff", "color": "#333333", "strokeColor": "#333333", "thickness": 1, "visible": true, "layer": 0}
      ],
      "polygons": [
        {"id": "inner", "type": "polygon", "points": [{"x":-120,"y":-37.5},{"x":160,"y":-37.5},{"x":147.5,"y":5},{"x":-107.5,"y":5}], "cornerRadius": 8, "closed": true, "fill": "#ffffff", "color": "#333333", "strokeColor": "#333333", "thickness": 2, "visible": true, "layer": 0}
      ],
      "lines": [], "paths": [], "malePins": [], "femalePins": [], "texts": [], "customSvgs": [], "images": []
    },
    "pins": [
      {"pinNumber":"1","x":-100,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"2","x":-80,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"3","x":-60,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"4","x":-40,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"5","x":-20,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"6","x":0,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"7","x":20,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"8","x":40,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"9","x":60,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"10","x":80,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"11","x":100,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"12","x":120,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"13","x":140,"y":-25,"radius":8,"gender":"male"},
      {"pinNumber":"14","x":-90,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"15","x":-70,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"16","x":-50,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"17","x":-30,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"18","x":-10,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"19","x":10,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"20","x":30,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"21","x":50,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"22","x":70,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"23","x":90,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"24","x":110,"y":-7.5,"radius":8,"gender":"male"},
      {"pinNumber":"25","x":130,"y":-7.5,"radius":8,"gender":"male"}
    ]
  }
}
\`\`\`

### Kycon KPJX-PM-4S-S Power Jack (D-shaped polygon, circular cavity)
\`\`\`json
{
  "svg": {
    "clear": true,
    "elements": {
      "polygons": [
        {"id": "d_shape", "type": "polygon", "points": [{"x":120,"y":72},{"x":40,"y":112},{"x":40,"y":144},{"x":120,"y":184},{"x":168,"y":184},{"x":248,"y":144},{"x":248,"y":112},{"x":168,"y":72}], "cornerRadius": 4, "closed": true, "fill": "#636769", "color": "#333333", "strokeColor": "#333333", "thickness": 4, "visible": true, "layer": 0}
      ],
      "circles": [
        {"id": "cavity", "type": "circle", "cx": 144, "cy": 128, "r": 40, "thickness": 6, "color": "#333333", "strokeColor": "#333333", "visible": true, "layer": 1},
        {"id": "mount1", "type": "circle", "cx": 64, "cy": 128, "r": 11.3, "fill": "#ffffff", "color": "#333333", "strokeColor": "none", "thickness": 2, "visible": true, "layer": 1},
        {"id": "mount2", "type": "circle", "cx": 224, "cy": 128, "r": 11.3, "fill": "#ffffff", "color": "#333333", "strokeColor": "none", "thickness": 2, "visible": true, "layer": 1}
      ],
      "rectangles": [], "lines": [], "paths": [], "malePins": [], "femalePins": [], "texts": [], "customSvgs": [], "images": []
    },
    "pins": [
      {"pinNumber": "1", "x": 120, "y": 120, "radius": 8, "gender": "female"},
      {"pinNumber": "2", "x": 168, "y": 120, "radius": 8, "gender": "female"},
      {"pinNumber": "3", "x": 128, "y": 144, "radius": 8, "gender": "female"},
      {"pinNumber": "4", "x": 160, "y": 144, "radius": 8, "gender": "female"}
    ]
  }
}
\`\`\`

### JST XH 4-pin header (simple rectangular)
\`\`\`json
{
  "svg": {
    "clear": true,
    "elements": {
      "rectangles": [
        {"id": "body", "type": "rectangle", "x": -30, "y": 0, "width": 60, "height": 40, "thickness": 2, "color": "#333333", "strokeColor": "#333333", "fill": "#f5f5dc", "visible": true, "layer": 0},
        {"id": "shroud_left", "type": "rectangle", "x": -32, "y": 5, "width": 4, "height": 30, "thickness": 1, "color": "#333333", "strokeColor": "#333333", "fill": "#f5f5dc", "visible": true, "layer": 0},
        {"id": "shroud_right", "type": "rectangle", "x": 28, "y": 5, "width": 4, "height": 30, "thickness": 1, "color": "#333333", "strokeColor": "#333333", "fill": "#f5f5dc", "visible": true, "layer": 0},
        {"id": "shroud_top", "type": "rectangle", "x": -30, "y": 0, "width": 60, "height": 5, "thickness": 1, "color": "#333333", "strokeColor": "#333333", "fill": "#f5f5dc", "visible": true, "layer": 0}
      ],
      "circles": [], "polygons": [], "lines": [], "paths": [], "malePins": [], "femalePins": [], "texts": [], "customSvgs": [], "images": []
    },
    "pins": [
      {"pinNumber": "1", "x": -19, "y": 25, "radius": 5, "gender": "male"},
      {"pinNumber": "2", "x": -6, "y": 25, "radius": 5, "gender": "male"},
      {"pinNumber": "3", "x": 7, "y": 25, "radius": 5, "gender": "male"},
      {"pinNumber": "4", "x": 20, "y": 25, "radius": 5, "gender": "male"}
    ]
  }
}
\`\`\`
`;

export function registerSchemaResource(server: McpServer) {
  server.resource(
    'plan_schema',
    'splice://schema/plan-data',
    {
      description: 'JSON schema and documentation for Splice PlanData. Read this before constructing plans with save_plan.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'splice://schema/plan-data',
        mimeType: 'text/markdown',
        text: PLAN_DATA_SCHEMA,
      }],
    }),
  );

  server.resource(
    'component_creator_schema',
    'splice://schema/component-creator',
    {
      description: 'Schema and examples for creating components with SVG graphics via the Component Creator bridge. Read this before using setComponentState.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'splice://schema/component-creator',
        mimeType: 'text/markdown',
        text: COMPONENT_CREATOR_SCHEMA,
      }],
    }),
  );
}
