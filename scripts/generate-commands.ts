/**
 * Generate command registry from frontend plan command classes.
 *
 * Parses every command file in frontend/src/commands/plan/ using the
 * TypeScript Compiler API, extracts class names and constructor signatures,
 * and outputs a registry JSON that the MCP server can use.
 *
 * Usage: npx tsx scripts/generate-commands.ts
 */

import ts from 'typescript';
import { writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, basename } from 'path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const MCP_ROOT = resolve(SCRIPT_DIR, '..');
const FRONTEND = process.env.SPLICE_FRONTEND_PATH
  ? resolve(process.env.SPLICE_FRONTEND_PATH)
  : resolve(MCP_ROOT, '../frontend');
const OUTPUT = resolve(MCP_ROOT, 'generated/command-registry.json');

if (!existsSync(resolve(FRONTEND, 'src/commands'))) {
  console.error(`Commands directory not found at ${resolve(FRONTEND, 'src/commands')}`);
  console.error('Set SPLICE_FRONTEND_PATH to the frontend directory.');
  process.exit(1);
}

interface ParamInfo {
  name: string;
  type: string;
  required: boolean;
}

interface CommandInfo {
  className: string;
  file: string;
  domain: string;
  stores: string[];
  params: ParamInfo[];
}

// Store type patterns to detect
const STORE_PATTERNS: Record<string, string> = {
  'ReturnType<typeof usePlanStore>': 'planStore',
  'ReturnType<typeof useHarnessWindowStore>': 'windowStore',
  'PlanStoreType': 'planStore',
  'WindowStoreType': 'windowStore',
  'SvgEditorStoreInterface': 'svgEditorStore',
};

// Command directories to scan with their domain names
const COMMAND_DIRS: Array<{ dir: string; domain: string; exclude: string[] }> = [
  { dir: resolve(FRONTEND, 'src/commands/plan'), domain: 'plan', exclude: ['index', 'types', 'planCommandUtils'] },
  { dir: resolve(FRONTEND, 'src/commands/svg-editor'), domain: 'svg-editor', exclude: ['index', 'interfaces', 'SvgCommand', 'SvgCommandHistory', 'SvgEditorCommandIntegration'] },
  { dir: resolve(FRONTEND, 'src/commands/harness-builder'), domain: 'harness-builder', exclude: ['index'] },
];

console.log('Generating command registry from all command directories...');

// Recursively collect .ts files from a directory
function collectTsFiles(dir: string, exclude: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full, exclude));
    } else if (entry.endsWith('.ts') && !exclude.some(e => entry.startsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// Collect all command files across directories
const commandFiles: Array<{ path: string; domain: string }> = [];
for (const { dir, domain, exclude } of COMMAND_DIRS) {
  if (!existsSync(dir)) {
    console.log(`  ⚠ Skipping ${domain} — directory not found: ${dir}`);
    continue;
  }
  const files = collectTsFiles(dir, exclude).map(p => ({ path: p, domain }));
  commandFiles.push(...files);
  console.log(`  ${domain}: ${files.length} files`);
}

console.log(`  Total: ${commandFiles.length} command files`);

// Build file-to-domain lookup
const fileDomainMap = new Map<string, string>();
for (const { path: p, domain } of commandFiles) {
  fileDomainMap.set(p, domain);
}

// Create TypeScript program
const program = ts.createProgram(commandFiles.map(f => f.path), {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  baseUrl: FRONTEND,
  paths: {
    'src/*': ['./src/*'],
  },
});

const checker = program.getTypeChecker();
const commands: CommandInfo[] = [];

for (const sourceFile of program.getSourceFiles()) {
  // Skip node_modules and non-command files
  if (sourceFile.isDeclarationFile) continue;
  // Match by checking if the file path contains a known command directory name
  const domain = fileDomainMap.get(sourceFile.fileName)
    ?? fileDomainMap.get(resolve(sourceFile.fileName))
    ?? COMMAND_DIRS.find(d => sourceFile.fileName.includes(`/commands/${d.domain}/`))?.domain;
  if (!domain) continue;

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isClassDeclaration(node)) return;
    if (!node.name) return;

    const className = node.name.text;

    // Only process exported classes that end with 'Command'
    if (!className.endsWith('Command')) return;
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) return;

    // Find constructor
    const constructor = node.members.find(ts.isConstructorDeclaration);
    if (!constructor || !constructor.parameters) return;

    const stores: string[] = [];
    const params: ParamInfo[] = [];

    for (const param of constructor.parameters) {
      const paramName = param.name.getText(sourceFile);
      const paramType = param.type ? param.type.getText(sourceFile) : 'unknown';
      const isOptional = !!param.questionToken || !!param.initializer;

      // Check if this is a store parameter
      let isStore = false;
      for (const [pattern, storeName] of Object.entries(STORE_PATTERNS)) {
        if (paramType.includes(pattern) || paramType.includes('usePlanStore') || paramType.includes('useHarnessWindowStore')) {
          if (paramType.includes('usePlanStore') || pattern.includes('PlanStore')) {
            stores.push('planStore');
          }
          if (paramType.includes('useHarnessWindowStore') || pattern.includes('WindowStore')) {
            stores.push('windowStore');
          }
          isStore = true;
          break;
        }
      }

      if (!isStore) {
        params.push({
          name: paramName,
          type: simplifyType(paramType),
          required: !isOptional,
        });
      }
    }

    commands.push({
      className,
      file: basename(sourceFile.fileName, '.ts'),
      domain,
      stores: [...new Set(stores)],
      params,
    });
  });
}

// Sort by class name
commands.sort((a, b) => a.className.localeCompare(b.className));

// Build registry
const registry: Record<string, Omit<CommandInfo, 'className'>> = {};
for (const cmd of commands) {
  registry[cmd.className] = {
    file: cmd.file,
    domain: cmd.domain,
    stores: cmd.stores,
    params: cmd.params,
  };
}

const output = {
  description: 'Auto-generated command registry from frontend/src/commands/. Lists all commands with constructor parameters, organized by domain (plan, svg-editor, harness-builder).',
  generated_at: new Date().toISOString(),
  command_count: commands.length,
  commands: registry,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

console.log(`\n✓ Generated registry for ${commands.length} commands`);
console.log(`  Stores breakdown: ${commands.filter(c => c.stores.includes('windowStore')).length} use windowStore, ${commands.filter(c => c.stores.length === 0).length} use no stores`);
console.log(`  Output: ${OUTPUT}`);

// ── Helpers ─────────────────────────────────────────────────────────────

function simplifyType(type: string): string {
  // Clean up verbose TypeScript types for readability
  return type
    .replace(/ReturnType<typeof \w+>/g, '')
    .replace(/import\([^)]+\)\.\w+/g, match => match.split('.').pop() || match)
    .replace(/\s+/g, ' ')
    .trim();
}
