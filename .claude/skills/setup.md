---
name: setup
description: Install and configure the Splice CAD MCP server for your AI tool
---

# Set Up Splice CAD MCP

Help the user install the Splice CAD MCP server. Follow these steps:

## 1. Check if already configured

Run this command to see if splice-cad is already set up:
```bash
claude mcp list 2>/dev/null | grep -i splice
```

If it's already there, tell the user it's configured and suggest running `/mcp` to verify the connection.

## 2. Get the API key

Ask the user for their Splice CAD API key. They can generate one at:
**https://splice-cad.com → Account → API Key**

If they don't have a Splice CAD account yet, direct them to https://splice-cad.com to request beta access.

## 3. Install

Run this command (replace `YOUR_API_KEY` with the user's actual key):

```bash
claude mcp add splice-cad -e SPLICE_API_URL=https://splice-cad.com -e SPLICE_API_KEY=YOUR_API_KEY -- npx @splice-cad/mcp
```

If the package isn't published on npm yet, use the local path instead:

```bash
claude mcp add splice-cad -e SPLICE_API_URL=https://splice-cad.com -e SPLICE_API_KEY=YOUR_API_KEY -- node /path/to/splice-cad-mcp/dist/index.js
```

## 4. Auto-approve tools (optional)

Ask if they want to auto-approve all Splice tools (no permission prompts):

```bash
claude config add permissions.allow "mcp__splice-cad__*"
```

## 5. Verify

Tell the user to start a new Claude Code session, then check the connection:
- The splice-cad tools should appear in the tool list
- Try: "Search for a Molex 4-pin connector" to test

## 6. Enable Live Bridge (optional)

If the user wants real-time canvas updates:
1. Open Splice CAD in the browser
2. Go to Settings (gear icon) → AI Agent Bridge → toggle On
3. The green "AI Agent" indicator appears when connected

## For other AI tools

If the user isn't using Claude Code, provide the JSON config for their tool:

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "splice-cad": {
      "command": "npx",
      "args": ["@splice-cad/mcp"],
      "env": {
        "SPLICE_API_URL": "https://splice-cad.com",
        "SPLICE_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

**Windsurf** (`~/.windsurf/mcp.json`) — same JSON format as Cursor.

**ChatGPT** — add as MCP server in Developer Mode settings with command `npx @splice-cad/mcp`.
