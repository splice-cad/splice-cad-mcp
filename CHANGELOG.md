# Changelog

## 0.3.3 (2026-03-31)

### Schema Clarifications (plan-data resource)

- **Termination disambiguation** — added callout explaining the three independent uses of "termination": termination nodes (ferrule/ring/quickdisconnect components), conductor endpoint contacts (`startTermination`/`endTermination`), and pin-level termination. These are orthogonal concepts that share a name.
- **Category vs shape interaction** — new "How Category and Shape Interact" section clarifying that mating behavior is driven by shape, not category. Only `flying_lead` and `terminal_point` categories affect behavior; all others (fuse, relay, etc.) behave as connectors.
- **Terminal point wiring pattern** — new dedicated section with the rule that conductors never terminate directly at a terminal_point node. Includes ASCII diagrams for connector→TB and TB↔TB patterns, and notes on shape choices (ferrule, ring, quickdisconnect).
- **Fixed inline ECU→TB example** — replaced direct-wiring example with correct ferrule intermediary pattern showing ferrule node, mate relationship, and distinction between node BOM entry (`type: "connector"`) and contact BOM entry (`type: "contact"`).
- **Strengthened Constraint #9** — changed from "recommended pattern" to mandatory rule, references new section.

### Example Fixes (plan-examples resource)

- **Pattern 1 (PS→CB→TB)** — added ferrule intermediary node between circuit breaker and terminal block with mate relationship. Conductors no longer wire directly to terminal block.
- **Pattern 5 (Terminal Block)** — completely rewritten. Now shows 2-position terminal block with per-position ferrule nodes, separate links, and mate relationships. Ferrule BOM entries correctly use `type: "connector"`. Key points updated to explain per-position pattern and termination shape choices.

## 0.2.0 (2026-03-29)

### Context Prompts

Added 3 context-setting prompts that establish the agent's operating mode, available tools, and guardrails:

- `plan-live` — Plan canvas via WebSocket bridge (use `execute_commands`/`get_live_state`, don't use `save_plan`)
- `component-creator-live` — Component Creator via WebSocket bridge (use `setComponentState`/`getComponentState`, don't use `execute_command`)
- `api-mode` — REST API only, no browser needed (use `save_plan`/`get_plan`, don't use bridge tools)

### Updated Task Prompts

All 5 existing task prompts now declare their operating mode upfront so the agent has correct context even when jumping straight into a task.

## 0.1.0 (2026-03-28)

Initial release.

### Tools (27)
- **Parts**: `search_connectors`, `search_wires`, `search_cables`, `get_part`, `create_component`, `create_cable`, `lookup_part`, `get_category_templates`
- **Projects & Plans**: `list_projects`, `create_project`, `get_project`, `get_plan`, `save_plan`, `get_plan_summary`, `validate_plan`, `generate_assembly`
- **Legacy Harnesses**: `list_harnesses`, `create_harness`, `get_harness`, `save_harness`, `get_harness_summary`
- **Live Bridge**: `is_bridge_connected`, `execute_command`, `execute_commands`, `undo`, `redo`, `get_live_state`

### Prompts (5)
- `build-harness` — build a complete harness from a description or datasheet
- `create-component` — create a rich component with specs, image, pin labels
- `review-live-plan` — connect via WebSocket and review the live plan
- `cleanup-layout` — reorganize component positions on the canvas
- `import-from-spreadsheet` — build from a CSV/Excel wiring schedule

### Resources (3)
- `splice://schema/plan-data` — PlanData JSON schema + behavioral rules
- `splice://schema/harness-data` — WorkingHarness schema
- `splice://examples/plans` — real-world harness patterns

### Features
- REST API tools for offline plan building (no browser needed)
- WebSocket live bridge for real-time canvas updates with undo/redo
- Auto-color correction on save (normalizes wire colors to standard hex/names)
- Multi-tab namespace support (project, harness, component creator)
- Auto-generated type schemas (30 types, 312 definitions) and command registry (259 commands)
- Works with Claude Code, ChatGPT, Cursor, Windsurf, Codex CLI
