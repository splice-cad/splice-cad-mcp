import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const PLAN_EXAMPLES = `# Splice Plan Examples — Cookbook

Copy-paste-ready patterns extracted from real production harnesses. Each example is a valid, self-contained PlanData fragment. Combine patterns to build complete harnesses.

## Pattern 1: Power Supply → Circuit Breaker → Terminal Block

A 24V power supply feeds a circuit breaker, which distributes power to a bridged terminal block.

\`\`\`json
{
  "nodes": {
    "comp_ps": {
      "id": "comp_ps", "type": "component", "label": "PS1",
      "name": "24V Power Supply",
      "category": "power_supply",
      "position": { "x": 100, "y": 300 },
      "pins": [
        { "id": "pin_ps_vp", "label": "V+", "function": "24V Output" },
        { "id": "pin_ps_vm", "label": "V-", "function": "Ground" }
      ],
      "bomEntryId": "bom_ps"
    },
    "comp_cb": {
      "id": "comp_cb", "type": "component", "label": "CB1",
      "name": "Electronic Circuit Breaker",
      "category": "circuit_breaker",
      "position": { "x": 400, "y": 300 },
      "pins": [
        { "id": "pin_cb_inp", "label": "IN+", "function": "Power Input" },
        { "id": "pin_cb_inm", "label": "IN-", "function": "Ground Input" },
        { "id": "pin_cb_outp", "label": "OUT+", "function": "Protected Output" },
        { "id": "pin_cb_outm", "label": "OUT-", "function": "Ground Output" }
      ],
      "bomEntryId": "bom_cb"
    },
    "comp_tb": {
      "id": "comp_tb", "type": "component", "label": "X1",
      "name": "24V Distribution Bus",
      "category": "terminal_point",
      "shape": "terminal_block",
      "position": { "x": 700, "y": 300 },
      "pins": [
        { "id": "pin_tb_1", "label": "1" },
        { "id": "pin_tb_2", "label": "2" },
        { "id": "pin_tb_3", "label": "3" },
        { "id": "pin_tb_4", "label": "4" }
      ],
      "bridged_positions": [[1, 2, 3, 4]],
      "bomEntryId": "bom_tb"
    }
  },
  "links": {
    "link_ps_cb": {
      "id": "link_ps_cb",
      "sourceNodeId": "comp_ps", "targetNodeId": "comp_cb",
      "length_mm": 200
    },
    "link_cb_tb": {
      "id": "link_cb_tb",
      "sourceNodeId": "comp_cb", "targetNodeId": "comp_tb",
      "length_mm": 300
    }
  },
  "conductors": {
    "cond_vp_in": {
      "id": "cond_vp_in", "netName": "net_24v",
      "gauge": "20 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "comp_ps", "pinId": "pin_ps_vp" },
      "endEndpoint": { "nodeId": "comp_cb", "pinId": "pin_cb_inp" },
      "linkPath": ["link_ps_cb"],
      "bomEntryId": "bom_wire_red"
    },
    "cond_gnd_in": {
      "id": "cond_gnd_in", "netName": "net_gnd",
      "gauge": "20 AWG", "color": "#000000",
      "startEndpoint": { "nodeId": "comp_ps", "pinId": "pin_ps_vm" },
      "endEndpoint": { "nodeId": "comp_cb", "pinId": "pin_cb_inm" },
      "linkPath": ["link_ps_cb"],
      "bomEntryId": "bom_wire_blk"
    },
    "cond_vp_out": {
      "id": "cond_vp_out", "netName": "net_24v_protected",
      "gauge": "20 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "comp_cb", "pinId": "pin_cb_outp" },
      "endEndpoint": { "nodeId": "comp_tb", "pinId": "pin_tb_1" },
      "linkPath": ["link_cb_tb"],
      "bomEntryId": "bom_wire_red"
    }
  },
  "nets": {
    "net_24v": { "name": "net_24v", "displayName": "24V" },
    "net_gnd": { "name": "net_gnd", "displayName": "GND" },
    "net_24v_protected": { "name": "net_24v_protected", "displayName": "24V Protected" }
  },
  "bom": [
    {
      "id": "bom_ps", "mpn": "CP10.241-M1", "manufacturer": "PULS",
      "description": "AC/DC DIN Rail Supply 24V 240W", "type": "connector",
      "spec": { "category": "power_supply", "positions": 2 }
    },
    {
      "id": "bom_cb", "mpn": "1464483", "manufacturer": "Phoenix Contact",
      "description": "Electronic Circuit Breaker 4A", "type": "connector",
      "spec": { "category": "circuit_breaker", "positions": 4 }
    },
    {
      "id": "bom_tb", "mpn": "3273268", "manufacturer": "Phoenix Contact",
      "description": "PTFIX 6-pos Distribution Block Red", "type": "connector",
      "spec": { "positions": 4, "shape": "terminal_block", "bridged_positions": [[1,2,3,4]] }
    },
    {
      "id": "bom_wire_red", "mpn": "20UL1015STRRED", "manufacturer": "Remington Industries",
      "description": "20 AWG Stranded Red", "type": "wire",
      "spec": { "gauge": "20 AWG", "color": "red" }
    },
    {
      "id": "bom_wire_blk", "mpn": "20UL1015STRBLA", "manufacturer": "Remington Industries",
      "description": "20 AWG Stranded Black", "type": "wire",
      "spec": { "gauge": "20 AWG", "color": "black" }
    }
  ],
  "wireGroups": {}, "cables": {}, "signals": {}, "mates": [],
  "deviceGroups": [], "conductorSplices": {}, "assemblyRefs": {}
}
\`\`\`

## Pattern 2: Connector with Crimp Contacts

Two Molex Micro-Fit connectors wired point-to-point, each conductor has crimp terminations at both ends.

\`\`\`json
{
  "nodes": {
    "comp_a": {
      "id": "comp_a", "type": "component", "label": "X1",
      "name": "PCB Connector",
      "position": { "x": 100, "y": 300 },
      "shape": "rectangular",
      "pins": [
        { "id": "pin_a1", "label": "1", "function": "Power" },
        { "id": "pin_a2", "label": "2", "function": "Signal" },
        { "id": "pin_a3", "label": "3", "function": "Ground" }
      ],
      "bomEntryId": "bom_molex_3f"
    },
    "comp_b": {
      "id": "comp_b", "type": "component", "label": "X2",
      "name": "Sensor Connector",
      "position": { "x": 600, "y": 300 },
      "shape": "rectangular",
      "pins": [
        { "id": "pin_b1", "label": "1", "function": "Power" },
        { "id": "pin_b2", "label": "2", "function": "Signal" },
        { "id": "pin_b3", "label": "3", "function": "Ground" }
      ],
      "bomEntryId": "bom_molex_3m"
    }
  },
  "links": {
    "link_1": {
      "id": "link_1",
      "sourceNodeId": "comp_a", "targetNodeId": "comp_b",
      "length_mm": 500
    }
  },
  "conductors": {
    "cond_pwr": {
      "id": "cond_pwr", "netName": "net_pwr",
      "gauge": "22 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "comp_a", "pinId": "pin_a1" },
      "endEndpoint": { "nodeId": "comp_b", "pinId": "pin_b1" },
      "linkPath": ["link_1"],
      "startTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp" },
      "endTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp" },
      "bomEntryId": "bom_wire_red22"
    },
    "cond_sig": {
      "id": "cond_sig", "netName": "net_sig",
      "gauge": "22 AWG", "color": "#0000FF",
      "startEndpoint": { "nodeId": "comp_a", "pinId": "pin_a2" },
      "endEndpoint": { "nodeId": "comp_b", "pinId": "pin_b2" },
      "linkPath": ["link_1"],
      "startTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp" },
      "endTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp" },
      "bomEntryId": "bom_wire_blu22"
    },
    "cond_gnd": {
      "id": "cond_gnd", "netName": "net_gnd",
      "gauge": "22 AWG", "color": "#000000",
      "startEndpoint": { "nodeId": "comp_a", "pinId": "pin_a3" },
      "endEndpoint": { "nodeId": "comp_b", "pinId": "pin_b3" },
      "linkPath": ["link_1"],
      "startTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp" },
      "endTermination": { "method": "crimp", "contactBomEntryId": "bom_crimp" },
      "bomEntryId": "bom_wire_blk22"
    }
  },
  "mates": [
    {
      "id": "mate_1", "connector1Id": "comp_a", "connector2Id": "comp_b",
      "pinMappings": [
        { "pin1Id": "pin_a1", "pin2Id": "pin_b1" },
        { "pin1Id": "pin_a2", "pin2Id": "pin_b2" },
        { "pin1Id": "pin_a3", "pin2Id": "pin_b3" }
      ]
    }
  ],
  "nets": {
    "net_pwr": { "name": "net_pwr", "displayName": "VCC" },
    "net_sig": { "name": "net_sig", "displayName": "SIG" },
    "net_gnd": { "name": "net_gnd", "displayName": "GND" }
  },
  "bom": [
    {
      "id": "bom_molex_3f", "mpn": "0436450300", "manufacturer": "Molex",
      "description": "Micro-Fit 3.0 3-pos Receptacle", "type": "connector",
      "spec": { "positions": 3, "gender": "female", "series": "Micro-Fit 3.0", "shape": "rectangular" }
    },
    {
      "id": "bom_molex_3m", "mpn": "0430250300", "manufacturer": "Molex",
      "description": "Micro-Fit 3.0 3-pos Header", "type": "connector",
      "spec": { "positions": 3, "gender": "male", "series": "Micro-Fit 3.0", "shape": "rectangular" }
    },
    {
      "id": "bom_crimp", "mpn": "0430300051", "manufacturer": "Molex",
      "description": "Micro-Fit Crimp Socket 20-24 AWG Tin", "type": "contact",
      "spec": { "gender": "female" }
    },
    {
      "id": "bom_wire_red22", "mpn": "22UL1015STRRED", "manufacturer": "Remington Industries",
      "description": "22 AWG Stranded Red", "type": "wire",
      "spec": { "gauge": "22 AWG", "color": "red" }
    },
    {
      "id": "bom_wire_blu22", "mpn": "22UL1015STRBLU", "manufacturer": "Remington Industries",
      "description": "22 AWG Stranded Blue", "type": "wire",
      "spec": { "gauge": "22 AWG", "color": "blue" }
    },
    {
      "id": "bom_wire_blk22", "mpn": "22UL1015STRBLA", "manufacturer": "Remington Industries",
      "description": "22 AWG Stranded Black", "type": "wire",
      "spec": { "gauge": "22 AWG", "color": "black" }
    }
  ],
  "wireGroups": {}, "cables": {}, "signals": {},
  "deviceGroups": [], "conductorSplices": {}, "assemblyRefs": {}
}
\`\`\`

## Pattern 3: Branch Point with Power Distribution

A single power feed splits at a branch point to three downstream devices. The branch point has no BOM entry — it's just a routing junction.

\`\`\`json
{
  "nodes": {
    "comp_src": {
      "id": "comp_src", "type": "component", "label": "PS1",
      "name": "Power Supply",
      "category": "power_supply",
      "position": { "x": 100, "y": 300 },
      "pins": [{ "id": "pin_vp", "label": "V+", "function": "24V Output" }],
      "bomEntryId": "bom_ps"
    },
    "bp_1": {
      "id": "bp_1", "type": "branch_point", "label": "BP1",
      "position": { "x": 400, "y": 300 }
    },
    "comp_d1": {
      "id": "comp_d1", "type": "component", "label": "X1",
      "name": "Device A",
      "position": { "x": 700, "y": 150 },
      "pins": [{ "id": "pin_d1_pwr", "label": "1", "function": "Power" }]
    },
    "comp_d2": {
      "id": "comp_d2", "type": "component", "label": "X2",
      "name": "Device B",
      "position": { "x": 700, "y": 300 },
      "pins": [{ "id": "pin_d2_pwr", "label": "1", "function": "Power" }]
    },
    "comp_d3": {
      "id": "comp_d3", "type": "component", "label": "X3",
      "name": "Device C",
      "position": { "x": 700, "y": 450 },
      "pins": [{ "id": "pin_d3_pwr", "label": "1", "function": "Power" }]
    }
  },
  "links": {
    "link_src_bp": {
      "id": "link_src_bp",
      "sourceNodeId": "comp_src", "targetNodeId": "bp_1",
      "length_mm": 300
    },
    "link_bp_d1": {
      "id": "link_bp_d1",
      "sourceNodeId": "bp_1", "targetNodeId": "comp_d1",
      "length_mm": 200
    },
    "link_bp_d2": {
      "id": "link_bp_d2",
      "sourceNodeId": "bp_1", "targetNodeId": "comp_d2",
      "length_mm": 200
    },
    "link_bp_d3": {
      "id": "link_bp_d3",
      "sourceNodeId": "bp_1", "targetNodeId": "comp_d3",
      "length_mm": 200
    }
  },
  "conductors": {
    "cond_main": {
      "id": "cond_main", "netName": "net_24v",
      "gauge": "18 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "comp_src", "pinId": "pin_vp" },
      "endEndpoint": { "nodeId": "bp_1" },
      "linkPath": ["link_src_bp"],
      "bomEntryId": "bom_wire_red18"
    },
    "cond_leg1": {
      "id": "cond_leg1", "netName": "net_24v",
      "gauge": "20 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "bp_1" },
      "endEndpoint": { "nodeId": "comp_d1", "pinId": "pin_d1_pwr" },
      "linkPath": ["link_bp_d1"],
      "bomEntryId": "bom_wire_red20"
    },
    "cond_leg2": {
      "id": "cond_leg2", "netName": "net_24v",
      "gauge": "20 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "bp_1" },
      "endEndpoint": { "nodeId": "comp_d2", "pinId": "pin_d2_pwr" },
      "linkPath": ["link_bp_d2"],
      "bomEntryId": "bom_wire_red20"
    },
    "cond_leg3": {
      "id": "cond_leg3", "netName": "net_24v",
      "gauge": "20 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "bp_1" },
      "endEndpoint": { "nodeId": "comp_d3", "pinId": "pin_d3_pwr" },
      "linkPath": ["link_bp_d3"],
      "bomEntryId": "bom_wire_red20"
    }
  },
  "conductorSplices": {
    "cs_1": {
      "id": "cs_1", "designator": "SP1",
      "branchPointId": "bp_1",
      "conductorIds": ["cond_main", "cond_leg1", "cond_leg2", "cond_leg3"],
      "spliceType": "butt",
      "splicePartName": "Butt Splice 18-20 AWG"
    }
  },
  "nets": {
    "net_24v": { "name": "net_24v", "displayName": "24V Bus" }
  },
  "bom": [
    { "id": "bom_ps", "mpn": "CP10.241", "manufacturer": "PULS",
      "description": "24V Power Supply", "type": "connector",
      "spec": { "category": "power_supply", "positions": 1 } },
    { "id": "bom_wire_red18", "mpn": "18AWG-RED", "manufacturer": "Generic",
      "description": "18 AWG Stranded Red", "type": "wire",
      "spec": { "gauge": "18 AWG", "color": "red" } },
    { "id": "bom_wire_red20", "mpn": "20AWG-RED", "manufacturer": "Generic",
      "description": "20 AWG Stranded Red", "type": "wire",
      "spec": { "gauge": "20 AWG", "color": "red" } }
  ],
  "wireGroups": {}, "cables": {}, "signals": {}, "mates": [],
  "deviceGroups": [], "assemblyRefs": {}
}
\`\`\`

**Key points:**
- Branch point endpoints have no \`pinId\` — just \`{ "nodeId": "bp_1" }\`
- All 4 conductors share the same \`netName\` (they're the same electrical net)
- \`conductorSplices\` defines the physical Y-splice at the branch point
- Main feed is 18 AWG (heavier for trunk), legs are 20 AWG (lighter for branches)

## Pattern 4: D-Sub Avionics Connector with Pin Functions

A 9-pin D-Sub connector for an avionics device with labeled pins and signal assignments.

\`\`\`json
{
  "nodes": {
    "comp_adsb": {
      "id": "comp_adsb", "type": "component", "label": "X1",
      "name": "ADS-B Receiver",
      "position": { "x": 100, "y": 300 },
      "shape": "dsub",
      "pins": [
        { "id": "pin_1", "label": "1", "function": "Power Input +28V" },
        { "id": "pin_2", "label": "2", "function": "RS-232 TX" },
        { "id": "pin_3", "label": "3", "function": "RS-232 RX" },
        { "id": "pin_4", "label": "4", "function": "Ground" },
        { "id": "pin_5", "label": "5", "function": "Antenna RF" },
        { "id": "pin_6", "label": "6", "function": "No Connect" },
        { "id": "pin_7", "label": "7", "function": "No Connect" },
        { "id": "pin_8", "label": "8", "function": "No Connect" },
        { "id": "pin_9", "label": "9", "function": "Shield Ground" }
      ],
      "bomEntryId": "bom_dsub9"
    },
    "comp_display": {
      "id": "comp_display", "type": "component", "label": "X2",
      "name": "EFIS Display",
      "position": { "x": 600, "y": 300 },
      "shape": "dsub",
      "pins": [
        { "id": "pin_d14", "label": "14", "function": "ADS-B RX Data" },
        { "id": "pin_d15", "label": "15", "function": "ADS-B TX Data" },
        { "id": "pin_d37", "label": "37", "function": "Ground" }
      ],
      "bomEntryId": "bom_dsub37"
    }
  },
  "links": {
    "link_1": {
      "id": "link_1",
      "sourceNodeId": "comp_adsb", "targetNodeId": "comp_display",
      "length_mm": 1000
    }
  },
  "conductors": {
    "cond_tx": {
      "id": "cond_tx", "netName": "net_adsb_tx",
      "gauge": "22 AWG", "color": "#00FF00",
      "startEndpoint": { "nodeId": "comp_adsb", "pinId": "pin_2" },
      "endEndpoint": { "nodeId": "comp_display", "pinId": "pin_d14" },
      "linkPath": ["link_1"]
    },
    "cond_rx": {
      "id": "cond_rx", "netName": "net_adsb_rx",
      "gauge": "22 AWG", "color": "#FFFF00",
      "startEndpoint": { "nodeId": "comp_adsb", "pinId": "pin_3" },
      "endEndpoint": { "nodeId": "comp_display", "pinId": "pin_d15" },
      "linkPath": ["link_1"]
    },
    "cond_gnd": {
      "id": "cond_gnd", "netName": "net_gnd",
      "gauge": "20 AWG", "color": "#000000",
      "startEndpoint": { "nodeId": "comp_adsb", "pinId": "pin_4" },
      "endEndpoint": { "nodeId": "comp_display", "pinId": "pin_d37" },
      "linkPath": ["link_1"]
    }
  },
  "wireGroups": {
    "wg_serial": {
      "id": "wg_serial", "linkId": "link_1",
      "method": "twisted",
      "conductorIds": ["cond_tx", "cond_rx"],
      "name": "RS-232 Twisted Pair"
    }
  },
  "mates": [
    {
      "id": "mate_1", "connector1Id": "comp_adsb", "connector2Id": "comp_display",
      "pinMappings": [
        { "pin1Id": "pin_2", "pin2Id": "pin_d14" },
        { "pin1Id": "pin_3", "pin2Id": "pin_d15" },
        { "pin1Id": "pin_4", "pin2Id": "pin_d37" }
      ]
    }
  ],
  "nets": {
    "net_adsb_tx": { "name": "net_adsb_tx", "displayName": "ADS-B TX" },
    "net_adsb_rx": { "name": "net_adsb_rx", "displayName": "ADS-B RX" },
    "net_gnd": { "name": "net_gnd", "displayName": "GND" }
  },
  "bom": [
    { "id": "bom_dsub9", "mpn": "SV-ADSB-472", "manufacturer": "Dynon Avionics",
      "description": "ADS-B Receiver D-Sub 9-pin", "type": "connector",
      "spec": { "positions": 9, "shape": "dsub", "gender": "male" } },
    { "id": "bom_dsub37", "mpn": "SV-HDX1100", "manufacturer": "Dynon Avionics",
      "description": "EFIS Display D-Sub 37-pin", "type": "connector",
      "spec": { "positions": 37, "shape": "dsub", "gender": "male" } }
  ],
  "cables": {}, "signals": {},
  "deviceGroups": [], "conductorSplices": {}, "assemblyRefs": {}
}
\`\`\`

**Key points:**
- D-Sub connectors use \`shape: "dsub"\`
- Pin \`function\` describes what each pin does (from the device datasheet)
- Pins labeled "No Connect" are defined but have no conductors
- TX/RX pair grouped as a \`wireGroup\` with \`method: "twisted"\`
- Wire group is scoped to a single link
- Mate relationship maps only the connected pins (not all 9)

## Pattern 5: Terminal Block with Ferrule Terminations

Wires terminated with ferrules connect to a terminal block. The ferrule is a contact on the conductor endpoint, the terminal block is a terminal_point node.

\`\`\`json
{
  "nodes": {
    "comp_dev": {
      "id": "comp_dev", "type": "component", "label": "X1",
      "name": "Controller",
      "position": { "x": 100, "y": 300 },
      "pins": [
        { "id": "pin_1", "label": "1", "function": "24V Out" },
        { "id": "pin_2", "label": "2", "function": "GND" }
      ]
    },
    "comp_tb": {
      "id": "comp_tb", "type": "component", "label": "X2",
      "name": "Field Terminal Block",
      "category": "terminal_point",
      "shape": "terminal_block",
      "position": { "x": 500, "y": 300 },
      "pins": [
        { "id": "pin_tb1", "label": "1" },
        { "id": "pin_tb2", "label": "2" }
      ],
      "bomEntryId": "bom_tb"
    }
  },
  "links": {
    "link_1": {
      "id": "link_1",
      "sourceNodeId": "comp_dev", "targetNodeId": "comp_tb",
      "length_mm": 400
    }
  },
  "conductors": {
    "cond_1": {
      "id": "cond_1", "netName": "net_24v",
      "gauge": "18 AWG", "color": "#FF0000",
      "startEndpoint": { "nodeId": "comp_dev", "pinId": "pin_1" },
      "endEndpoint": { "nodeId": "comp_tb", "pinId": "pin_tb1" },
      "linkPath": ["link_1"],
      "endTermination": { "method": "crimp", "contactBomEntryId": "bom_ferrule" }
    },
    "cond_2": {
      "id": "cond_2", "netName": "net_gnd",
      "gauge": "18 AWG", "color": "#000000",
      "startEndpoint": { "nodeId": "comp_dev", "pinId": "pin_2" },
      "endEndpoint": { "nodeId": "comp_tb", "pinId": "pin_tb2" },
      "linkPath": ["link_1"],
      "endTermination": { "method": "crimp", "contactBomEntryId": "bom_ferrule" }
    }
  },
  "nets": {
    "net_24v": { "name": "net_24v", "displayName": "24V" },
    "net_gnd": { "name": "net_gnd", "displayName": "GND" }
  },
  "bom": [
    { "id": "bom_tb", "mpn": "3273278", "manufacturer": "Phoenix Contact",
      "description": "PTFIX 2-pos Terminal Block", "type": "connector",
      "spec": { "positions": 2, "shape": "terminal_block" } },
    { "id": "bom_ferrule", "mpn": "AI 1.5-8 RD", "manufacturer": "Phoenix Contact",
      "description": "Ferrule 18 AWG Insulated Red", "type": "contact" }
  ],
  "wireGroups": {}, "cables": {}, "signals": {}, "mates": [],
  "deviceGroups": [], "conductorSplices": {}, "assemblyRefs": {}
}
\`\`\`

**Key points:**
- Terminal block uses \`category: "terminal_point"\` and \`shape: "terminal_block"\`
- Ferrule is a \`type: "contact"\` BOM entry — NOT a node
- Only the terminal block end has a termination (\`endTermination\`) — the controller end connects directly
- The ferrule BOM entry is shared across multiple conductors (same part reused)
`;

export function registerExamplesResource(server: McpServer) {
  server.resource(
    'plan_examples',
    'splice://examples/plans',
    {
      description: 'Cookbook of real-world cable harness patterns with complete, valid PlanData JSON. Copy and adapt these patterns to build harnesses.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'splice://examples/plans',
        mimeType: 'text/markdown',
        text: PLAN_EXAMPLES,
      }],
    }),
  );
}
