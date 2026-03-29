<p align="center">
  <img src="https://splice-cad.com/icons/bundle-icon.svg" alt="Splice CAD" width="80" />
</p>

# @splice-cad/mcp

MCP server for [Splice CAD](https://splice-cad.com) cable assembly and wiring harness design tool. Lets AI agents search parts, build harness plans, create components with rich specs, and generate manufacturing documentation.

Works with **Claude Code**, **ChatGPT**, **Cursor**, **Windsurf**, **Codex CLI**, and any MCP-compatible client.

> **Beta** — Splice CAD is currently in beta. [Request access](https://splice-cad.com) to get started.

## Installation

**From npm** (coming soon):
```bash
npx @splice-cad/mcp
```

**From source:**
```bash
git clone https://github.com/splice-cad/splice-cad-mcp.git
cd splice-cad-mcp
npm install
npm run build
```

Then point your MCP config to the built file:
```json
"command": "node",
"args": ["/path/to/splice-cad-mcp/dist/index.js"]
```

**Requirements:**
- Node.js 18+
- A Splice CAD account with an API key (generate in Account > API Key)

## Quick Install

**Claude Code** (one command):
```bash
claude mcp add splice-cad -e SPLICE_API_URL=https://splice-cad.com -e SPLICE_API_KEY=your-key -- npx @splice-cad/mcp
```

For other tools, see the setup sections below.

## Setup

### Claude Code

```json
// ~/.claude/mcp.json
{
  "mcpServers": {
    "splice-cad": {
      "command": "npx",
      "args": ["@splice-cad/mcp"],
      "env": {
        "SPLICE_API_URL": "https://splice-cad.com",
        "SPLICE_API_KEY": "your-api-key"
      }
    }
  }
}
```

Auto-approve all tools:
```bash
claude config add permissions.allow "mcp__splice-cad__*"
```

### Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "splice-cad": {
      "command": "npx",
      "args": ["@splice-cad/mcp"],
      "env": {
        "SPLICE_API_URL": "https://splice-cad.com",
        "SPLICE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Windsurf

```json
// ~/.windsurf/mcp.json
{
  "mcpServers": {
    "splice-cad": {
      "command": "npx",
      "args": ["@splice-cad/mcp"],
      "env": {
        "SPLICE_API_URL": "https://splice-cad.com",
        "SPLICE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### ChatGPT (Developer Mode)

In ChatGPT settings, add an MCP server:
- **Command:** `npx @splice-cad/mcp`
- **Environment:** `SPLICE_API_URL=https://splice-cad.com`, `SPLICE_API_KEY=your-key`

### OpenAI Responses API

```python
import openai

response = openai.responses.create(
    model="gpt-4.1",
    input="Build me a 4-pin Deutsch DT connector harness",
    tools=[{
        "type": "mcp",
        "server_label": "splice-cad",
        "server_url": "npx @splice-cad/mcp",
        "require_approval": "never",
        "headers": {
            "SPLICE_API_URL": "https://splice-cad.com",
            "SPLICE_API_KEY": "your-api-key"
        }
    }]
)
```

### Codex CLI

```bash
codex --mcp splice-cad="npx @splice-cad/mcp"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPLICE_API_URL` | Yes | Splice backend URL |
| `SPLICE_API_KEY` | Yes | API key (Account > API Key in Splice) |
| `SPLICE_BRIDGE_PORT` | No | WebSocket bridge port (default: `9876`) |
| `SPLICE_BRIDGE_SECRET` | No | Shared secret for WS auth (auto-generated) |

## Prompts

### Context Prompts

Set the agent's operating mode — which tools to use, which to avoid, and the correct workflow:

| Prompt | Mode | Description |
|--------|------|-------------|
| `plan-live` | WebSocket | Work on a plan open in the browser — live canvas updates with undo/redo |
| `component-creator-live` | WebSocket | Work in the Component Creator — update form, specs, SVG, and pins in real-time |
| `api-mode` | REST API | No browser needed — create projects, build plans, search parts, manage harnesses |

### Task Prompts

Step-by-step workflows that include their operating context:

| Prompt | Mode | Description |
|--------|------|-------------|
| `build-harness` | API | Build a complete cable harness from a description or datasheet |
| `create-component` | API | Create a part with specs, image, pin labels from an MPN or datasheet |
| `review-live-plan` | Live | Connect via WebSocket, read live plan state, suggest improvements |
| `cleanup-layout` | Live | Read component positions and reorganize for better layout |
| `import-from-spreadsheet` | API | Build a harness from a CSV/Excel wiring schedule |

## Tools (27)

### Parts & Components
| Tool | Description |
|------|-------------|
| `search_connectors` | Fuzzy search ("molex 4 pin", "deutsch dt") |
| `search_wires` | Fuzzy search ("22 awg red") |
| `search_cables` | Fuzzy search ("4 core shielded") |
| `get_part` | Full part details by ID |
| `create_component` | Create with images, specs, SVG, pin labels |
| `create_cable` | Create multi-conductor cable |
| `lookup_part` | DigiKey lookup (images, datasheets, specs) |
| `get_category_templates` | Default specs per component category |

### Projects & Plans
| Tool | Description |
|------|-------------|
| `list_projects` | List user's projects |
| `create_project` | Create new project |
| `get_project` | Get project with plan and assemblies |
| `get_plan` | Get plan data (filterable) |
| `save_plan` | Save PlanData JSON (auto-corrects colors) |
| `get_plan_summary` | Components, pins, connections, warnings |
| `validate_plan` | Check for structural issues |
| `generate_assembly` | Generate harness from plan selection |

### Legacy Harnesses
| Tool | Description |
|------|-------------|
| `list_harnesses` | List standalone harnesses |
| `create_harness` | Create from WorkingHarness JSON |
| `get_harness` | Load with hydrated BOM |
| `save_harness` | Save modified harness |
| `get_harness_summary` | Compact summary |

### Live Bridge (WebSocket)
| Tool | Description |
|------|-------------|
| `is_bridge_connected` | Check connected browser tabs |
| `execute_command` | Single command (live canvas update) |
| `execute_commands` | Batch (atomic, single undo) |
| `undo` / `redo` | Undo/redo in browser |
| `get_live_state` | Query live state (plan, component, SVG) |

## Resources

| URI | Description |
|-----|-------------|
| `splice://schema/plan-data` | PlanData JSON schema + behavioral rules |
| `splice://schema/harness-data` | WorkingHarness schema |
| `splice://examples/plans` | Real-world harness patterns |

## Examples

See **[EXAMPLES.md](EXAMPLES.md)** for detailed walkthroughs including:
- Terminal blocks with ferrule terminations
- Importing from a CSV wiring schedule
- Live: generating a cable assembly from a datasheet PDF
- Live: reading a KiCad schematic and creating 21 connectors across 4 pages
- Live: reviewing and fixing an open plan

## Architecture

There are two communication paths — one to the Splice cloud, one entirely local:

```
┌─────────────────────────────────────────────────────────┐
│                   YOUR MACHINE                          │
│                                                         │
│  ┌──────────────┐    stdio     ┌──────────────────┐     │
│  │  AI Agent    │◄────────────►│  MCP Server      │     │
│  │  (Claude,    │              │  (splice-cad)    │     │
│  │   Cursor,    │              │                  │     │
│  │   ChatGPT)   │              │  ┌────────────┐  │     │
│  └──────────────┘              │  │ WS Server  │  │     │
│                                │  │ :9876      │  │     │
│                                │  └─────┬──────┘  │     │
│                                └────────┼─────────┘     │
│                                         │ WebSocket     │
│                                         │ (localhost)   │
│                                ┌────────▼─────────┐     │
│                                │  Splice Browser  │     │
│                                │  Tab             │     │
│                                │  (canvas + stores)│    │
│                                └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (API key auth)
                         ▼
              ┌──────────────────┐
              │  Splice Cloud    │
              │  splice-cad.com  │
              │  (REST API)      │
              └──────────────────┘
```

### REST Tools (save_plan, search_connectors, etc.)

These make HTTPS requests to the Splice API at `splice-cad.com`. Your API key authenticates each request. Data travels over the internet. These work without a browser open.

### Live Bridge Tools (execute_command, get_live_state, etc.)

These communicate **entirely on your local machine**:

1. The MCP server starts a WebSocket server on `localhost:9876`
2. The Splice browser tab connects to it (when Agent Bridge is enabled)
3. Agent commands flow: Agent → MCP process → WebSocket → Browser tab
4. The browser executes commands — same as clicking in the UI
5. Canvas updates instantly, actions appear in undo history

**No data leaves your machine for live bridge commands.** The WebSocket connection is `localhost` only — it never touches the internet. The Splice CAD cloud is not involved in live command execution.

### What goes where

| Action | Path | Data leaves machine? |
|--------|------|---------------------|
| Search parts | HTTPS → splice-cad.com | Yes |
| Save/load plan | HTTPS → splice-cad.com | Yes |
| Create component | HTTPS → splice-cad.com | Yes |
| `execute_command` (live) | WebSocket → localhost:9876 | **No** |
| `get_live_state` (live) | WebSocket → localhost:9876 | **No** |
| `undo` / `redo` (live) | WebSocket → localhost:9876 | **No** |

## Security

### API Key

Your Splice API key authenticates all REST API calls. It is:
- Stored only in your MCP config file (never sent to the AI agent or logged)
- Scoped to your user account — can only access your own projects and harnesses
- Revocable at any time from Splice Account > API Key
- Rate-limited by your subscription tier (weekly request quota)

**Never commit your API key to git.** Use environment variables or a local config file.

### WebSocket Bridge

The WebSocket bridge runs on `localhost` only:
- **No internet exposure** — the WS server binds to `127.0.0.1`, not `0.0.0.0`
- **Shared secret** — the MCP server generates a random secret on startup and writes it to `~/.splice-bridge.json`. The browser must send this secret to authenticate. This prevents other local processes from sending commands.
- **One connection per namespace** — if two tabs try to connect with the same namespace, the older one is disconnected
- **Port configurable** — change `SPLICE_BRIDGE_PORT` if 9876 conflicts with another service

### What the AI agent can access

Through the MCP tools, the agent can:
- **Read** your projects, plans, harnesses, and parts (same as what you see in the app)
- **Write** plans and harnesses (create, modify, save — same as you editing in the UI)
- **Execute commands** on the live canvas (when bridge is connected)
- **Search** the shared parts database

The agent **cannot**:
- Access other users' private data
- Delete your account or change your password
- Access files on your computer (beyond what the AI client itself provides)
- Make network requests to anything other than the Splice API and localhost WebSocket

### Recommendations

- Only enable the Agent Bridge when actively using it
- Review agent actions before saving — all live changes are undoable with Ctrl+Z

## Development

### Building
```bash
npm install
npm run build
```

### Regenerating schemas (requires Splice frontend source)
```bash
SPLICE_FRONTEND_PATH=/path/to/splice/frontend npm run build:full
```

## License

MIT
