# Splice MCP Examples

Real-world examples of what agents can do with the Splice MCP server.

## Terminal Block with Ferrule Terminations

> "Add a Phoenix Contact terminal block and wire it to my ECU with ferrules"

The agent will:
1. Look up the terminal block on DigiKey
2. Create the component as a `terminal_point` with `terminal_block` shape
3. Create ferrule nodes for each position
4. Wire conductors from source connector through ferrules to terminal block
5. Add crimp terminations on conductor endpoints

---

## Import from a Wiring Schedule

> "Build a harness from this spreadsheet"

Paste a CSV like:
```
From,FromPin,To,ToPin,Gauge,Color,Signal
X1,1,X2,1,18 AWG,Red,12V Power
X1,2,X2,2,18 AWG,Black,Ground
X1,3,X2,3,22 AWG,Green,CAN_H
X1,4,X2,4,22 AWG,Yellow,CAN_L
```

The agent parses it, creates components, wires everything up, and saves.

---

## Live: Generate a Cable Assembly from a Datasheet

> User drops a PDF datasheet and the agent builds the design live on the canvas.

Requires: Splice open in browser with Agent Bridge enabled.

```
User: I cleared the canvas — generate this assembly
      [attaches Phoenix Contact 1522095.pdf]

Agent: This is a Phoenix Contact SAC-6P-M 8MS/1,5-PUR — a pre-terminated
       sensor/actuator cable assembly with:
       - One end: M8 6-pin male plug (circular)
       - Other end: Free conductor ends (bare wires)
       - Cable: 1.5m PUR, 6 conductors, 24 AWG

       I'll create:
       - X1: M8 plug (circular, 6 pins) with BOM: Phoenix Contact 1522095
       - X2: Free end (generic, 6 pins)
       - 1 bundle with 6 conductors:
         Pin 1: Brown, Pin 2: White, Pin 3: Blue,
         Pin 4: Black, Pin 5: Gray, Pin 6: Pink

User: Connect 6 pins, leave component generic

Agent: [calls execute_commands with 12 commands in one batch]
       → Both components appear on the canvas instantly
       → 6 colored conductors drawn between them
       → BOM assigned to M8 plug
       → All undoable with Ctrl+Z
```

---

## Live: Read a Schematic and Create All Connectors

> User drops a KiCad schematic PDF of a 3D printer controller board. The agent identifies all external connectors, proposes a multi-page layout, iterates with the user, then generates everything live.

Requires: Splice open in browser with Agent Bridge enabled.

```
User: Read this schematic and ID all jumpers, pins, and functions
      [attaches board.pdf — STM32-based 3D printer controller]

Agent: This is an STM32-based 3D printer controller. I see ~21 external
       connectors organized by function:

       Power (2): J37 (PSU 12/24V), J1 (USB-C)
       Motion (8): 4x motor connectors, 4x endstops
       Thermal (7): 2x heaters, 2x thermistors, 3x fans
       Peripherals (4): LCD, servo, probe, BLTouch

       I propose 4 pages. Each connector will have pin labels and
       functions from the schematic. For example:

       J37 — PSU Input:  Pin 1: VIN (12/24V), Pin 2: GND
       J11 — X Endstop:  Pin 1: X_STOP (signal), Pin 2: GND
       J10 — TFT/LCD:    10 pins (LCD_BEEP, LCD_BTN, TFT_TX, TFT_RX, ...)

User: Where are you seeing 8 pins for motors?

Agent: You're right — I conflated the steepstick module sockets with the
       actual motor output connectors. The actual steppers connect via
       4-pin connectors (A+, A-, B+, B-). Let me revise...

User: We also want functions for each pin.

Agent: [re-reads schematic, produces detailed pin tables for all 21 connectors]

User: Looks right. Generate it.

Agent: [creates 4 pages: Power, Motion, Thermal, Peripherals]
       [4 batched execute_commands calls — one per page]

       Page 1 "Power":       J37 (PSU), J1 (USB-C) — 6 pins total
       Page 2 "Motion":      4 motors + 4 endstops — 24 pins total
       Page 3 "Thermal":     2 heaters + 2 thermistors + 3 fans — 14 pins
       Page 4 "Peripherals": LCD + servo + probe + BLTouch — 20 pins

       21 components across 4 pages, all with pin-level function labels.
       All appear on the canvas instantly.
```

---

## Live: Clean Up a Messy Layout

> With Splice open and Agent Bridge connected, the agent reads the live plan, identifies layout issues, and nudges/aligns/resizes components to make it look professional.

Requires: Splice open in browser with Agent Bridge enabled.

```
User: This plan looks messy — clean it up

Agent: [calls is_bridge_connected — confirmed]
       [calls get_live_state({ query: "getSummary" })]

       I see 12 components across the canvas. Here's what I'd fix:

       Layout issues:
       - X1, X2, X3 are stacked vertically but not aligned (X offsets: 198, 205, 192)
       - X4 and X5 overlap at roughly the same position
       - BP1 is far from the components it connects to
       - Components have inconsistent sizes (X1 is 120x50, X2 is 100x50, X3 is 140x60)

       I'll:
       1. Align X1/X2/X3 to X=200 (left-align the column)
       2. Distribute them evenly with 80px vertical spacing
       3. Move X4 to the right of X5 with proper clearance
       4. Nudge BP1 closer to its connected bundles
       5. Resize all connectors to consistent 100x50

User: Do it

Agent: [calls execute_commands — single batch, single undo]:
       → AlignNodesCommand: X1, X2, X3 aligned to left edge
       → DistributeNodesCommand: even vertical spacing
       → MoveNodeCommand: X4 repositioned to (500, 200)
       → MoveNodeCommand: BP1 moved to (350, 350)
       → SetNodesSizeCommand: all connectors set to 100x50

       Everything snaps into place on the canvas. Ctrl+Z undoes the
       entire cleanup as one action.

User: Can you also space out the right-side components?

Agent: [reads positions of X6, X7, X8]
       [calls execute_commands]:
       → DistributeWithSpacingCommand: X6, X7, X8 evenly spaced at 100px gaps
       → AlignNodesCommand: right-align to X=700

       Done — right column is now evenly distributed and right-aligned.
```
