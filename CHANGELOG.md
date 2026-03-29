# Changelog

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
