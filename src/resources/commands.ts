/**
 * Bridge command contract: resource + tool + validation.
 *
 * Sourced from generated/bridge-commands.json (produced by
 * scripts/generate-bridge-commands.ts), which maps each bridge command to the
 * exact `params` keys its frontend builder reads. This is the authoritative
 * reference for execute_command/execute_commands — the constructor-derived
 * command-registry.json is NOT, because bridge keys and constructor parameter
 * names frequently differ.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import bridgeCommandsData from '../../generated/bridge-commands.json';

interface BridgeParam {
  name: string;
  required?: boolean;
  type?: string;
}
interface BridgeCommand {
  domain: string;
  params: BridgeParam[];
}

const COMMANDS = (bridgeCommandsData as { commands: Record<string, BridgeCommand> }).commands;

/** Pretty `{ a, b?, c? }` signature for a command's params. */
function signature(cmd: BridgeCommand): string {
  if (!cmd.params.length) return '{}';
  return `{ ${cmd.params.map(p => (p.required ? p.name : `${p.name}?`)).join(', ')} }`;
}

/** Commands whose name is similar to a (likely mistyped) query. */
function suggest(query: string): string[] {
  const q = query.toLowerCase();
  return Object.keys(COMMANDS)
    .filter(n => {
      const ln = n.toLowerCase();
      return ln.includes(q) || q.includes(ln) || ln.startsWith(q.slice(0, 4));
    })
    .slice(0, 8);
}

/**
 * Validate a bridge command's params before forwarding to the frontend.
 *
 * Conservative by design — returns an error string ONLY when we are confident:
 *   • the command is captured in the contract, AND
 *   • a param marked required is absent.
 * Unknown/uncaptured commands pass through (the contract is incomplete for
 * composite builders, and the frontend reports genuinely-unknown commands).
 * Extra/unexpected keys are never rejected (the bridge ignores them).
 *
 * Set SPLICE_SKIP_VALIDATION=1 to disable entirely.
 */
export function validateCommandParams(
  command: string,
  params: Record<string, unknown> | undefined,
): string | null {
  if (process.env.SPLICE_SKIP_VALIDATION) return null;
  if (command.startsWith('__')) return null; // __undo / __redo

  const cmd = COMMANDS[command];
  if (!cmd) return null; // not captured — let the frontend decide

  const provided = new Set(Object.keys(params ?? {}));
  const missing = cmd.params.filter(p => p.required && !provided.has(p.name)).map(p => p.name);
  if (missing.length === 0) return null;

  return (
    `Command "${command}" is missing required param(s): ${missing.join(', ')}. ` +
    `Expected params: ${signature(cmd)}. ` +
    `You provided: ${provided.size ? `{ ${[...provided].join(', ')} }` : '{}'}. ` +
    `Call describe_command or read the splice://commands resource for details.`
  );
}

// ── Resource + tool registration ─────────────────────────────────────────

function buildReference(): string {
  const byDomain: Record<string, string[]> = {};
  for (const [name, cmd] of Object.entries(COMMANDS)) {
    (byDomain[cmd.domain] ??= []).push(`- ${name}(${signature(cmd)})`);
  }
  let out = '# Splice bridge command contract\n\n';
  out +=
    'Exact `params` keys each command accepts via `execute_command` / `execute_commands`. ' +
    'Required params have no `?`. Match these key names exactly — they are NOT always the ' +
    'same as the command class constructor parameter names.\n';
  for (const domain of Object.keys(byDomain).sort()) {
    out += `\n## ${domain}\n\n${byDomain[domain].sort().join('\n')}\n`;
  }
  return out;
}

export function registerCommandResource(server: McpServer) {
  server.resource(
    'bridge_commands',
    'splice://commands',
    {
      description:
        'Authoritative list of every bridge command and the exact params keys it accepts ' +
        '(execute_command/execute_commands). Read this before sending commands — param key ' +
        'names differ from constructor parameter names for many commands.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{ uri: 'splice://commands', mimeType: 'text/markdown', text: buildReference() }],
    }),
  );

  server.tool(
    'describe_command',
    'Look up the exact params keys a bridge command accepts (for execute_command/execute_commands). ' +
      'Use this whenever unsure what params a command needs — the keys are NOT always the same as the ' +
      'constructor parameter names.',
    {
      command: z.string().describe('Command class name, e.g. "UpdateNodeCommand".'),
    },
    async ({ command }) => {
      const cmd = COMMANDS[command];
      if (!cmd) {
        const did = suggest(command);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(
              {
                found: false,
                command,
                message: `No contract captured for "${command}".`,
                ...(did.length ? { did_you_mean: did } : {}),
                hint: 'Read the splice://commands resource for the full list.',
              },
              null,
              2,
            ),
          }],
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(
            {
              found: true,
              command,
              domain: cmd.domain,
              signature: signature(cmd),
              params: cmd.params,
            },
            null,
            2,
          ),
        }],
      };
    },
  );
}
