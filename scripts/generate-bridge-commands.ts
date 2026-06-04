/**
 * Generate the *bridge* command contract from the frontend agent registries.
 *
 * Unlike generate-commands.ts (which reads command CONSTRUCTOR signatures),
 * this parses the hand-written builder maps in
 *   frontend/src/services/agentCommandRegistry.ts        (domain: plan)
 *   frontend/src/services/harnessAgentCommandRegistry.ts (domain: harness)
 * and extracts the exact `params.X` keys each builder reads. Those keys — not
 * the constructor parameter names — are the real contract a caller must match
 * when sending { command, params } over the bridge. The two frequently differ
 * (e.g. UpdateBomEntryCommand reads `params.updates`, but its constructor
 * param is named `newValues`), which is why command-registry.json is not a
 * safe source for validation or docs.
 *
 * Output: generated/bridge-commands.json
 * Usage:  SPLICE_FRONTEND_PATH=/path/to/frontend npx tsx scripts/generate-bridge-commands.ts
 */

import ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const MCP_ROOT = resolve(SCRIPT_DIR, '..');
const FRONTEND = process.env.SPLICE_FRONTEND_PATH
  ? resolve(process.env.SPLICE_FRONTEND_PATH)
  : resolve(MCP_ROOT, '../frontend');
const OUTPUT = resolve(MCP_ROOT, 'generated/bridge-commands.json');
const CTOR_REGISTRY = resolve(MCP_ROOT, 'generated/command-registry.json');

const REGISTRIES: Array<{ file: string; domain: string }> = [
  { file: resolve(FRONTEND, 'src/services/agentCommandRegistry.ts'), domain: 'plan' },
  { file: resolve(FRONTEND, 'src/services/harnessAgentCommandRegistry.ts'), domain: 'harness' },
];

interface ParamInfo {
  name: string;
  required?: boolean;
  type?: string;
}

// Pull required/type hints from the constructor registry by NAME match.
// (Positional mapping is unreliable — the bridge omits/reorders ctor args —
// so we only enrich keys whose name happens to match a constructor param.)
const ctorByName: Record<string, Record<string, { required: boolean; type: string }>> = {};
if (existsSync(CTOR_REGISTRY)) {
  const ctor = JSON.parse(readFileSync(CTOR_REGISTRY, 'utf8')).commands as Record<
    string,
    { params: Array<{ name: string; required: boolean; type: string }> }
  >;
  for (const [name, info] of Object.entries(ctor)) {
    ctorByName[name] = {};
    for (const p of info.params) ctorByName[name][p.name] = { required: p.required, type: p.type };
  }
}

const commands: Record<string, { domain: string; params: ParamInfo[] }> = {};

for (const { file, domain } of REGISTRIES) {
  if (!existsSync(file)) {
    console.log(`  ⚠ Skipping ${domain} — not found: ${file}`);
    continue;
  }
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ESNext, true);
  let count = 0;

  const visit = (node: ts.Node) => {
    // Find: const REGISTRY ... = { ... }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'REGISTRY' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const prop of node.initializer.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const cmdName = prop.name.getText(src).replace(/['"]/g, '');
        const fn = prop.initializer;
        if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) continue;

        // The params object is the LAST parameter (e.g. `p` in (ps, _ws, p)).
        const last = fn.parameters[fn.parameters.length - 1];
        if (!last || !ts.isIdentifier(last.name)) continue;
        const pName = last.name.text;

        // Collect `pName.<key>` accesses across the whole builder body, in order.
        const keys: string[] = [];
        const seen = new Set<string>();
        const walk = (n: ts.Node) => {
          if (
            ts.isPropertyAccessExpression(n) &&
            ts.isIdentifier(n.expression) &&
            n.expression.text === pName
          ) {
            const k = n.name.text;
            if (!seen.has(k)) {
              seen.add(k);
              keys.push(k);
            }
          }
          ts.forEachChild(n, walk);
        };
        walk(fn.body);

        const hints = ctorByName[cmdName] ?? {};
        commands[cmdName] = {
          domain,
          params: keys.map(name => {
            const h = hints[name];
            const p: ParamInfo = { name };
            if (h) {
              p.required = h.required;
              p.type = h.type;
            }
            return p;
          }),
        };
        count++;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  console.log(`  ${domain}: ${count} builders`);
}

const output = {
  description:
    'Auto-generated from the frontend agent command registries. Maps each bridge command to the exact `params` keys its builder reads. This is the contract for execute_command/execute_commands — match these keys, not the constructor parameter names.',
  generated_at: new Date().toISOString(),
  command_count: Object.keys(commands).length,
  commands,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
console.log(`\n✓ Generated bridge contract for ${output.command_count} commands`);
console.log(`  Output: ${OUTPUT}`);
