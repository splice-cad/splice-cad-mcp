/**
 * Generate JSON Schema from PlanData TypeScript interfaces.
 *
 * Reads frontend/src/interfaces/planInterfaces.ts and produces
 * generated/plan-schema.json with full type definitions.
 *
 * Usage: npx tsx scripts/generate-schema.ts
 */

import { createGenerator } from 'ts-json-schema-generator';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const MCP_ROOT = resolve(SCRIPT_DIR, '..');
const FRONTEND = process.env.SPLICE_FRONTEND_PATH
  ? resolve(process.env.SPLICE_FRONTEND_PATH)
  : resolve(MCP_ROOT, '../frontend');
const OUTPUT = resolve(MCP_ROOT, 'generated/plan-schema.json');

if (!existsSync(resolve(FRONTEND, 'src/interfaces/planInterfaces.ts'))) {
  console.error(`Frontend not found at ${FRONTEND}`);
  console.error('Set SPLICE_FRONTEND_PATH to the frontend directory.');
  process.exit(1);
}

// Types to extract, organized by source file
const TYPES_TO_EXTRACT: Array<{ type: string; file: string }> = [
  // Plan types (planInterfaces.ts)
  { type: 'PlanData', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanNode', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanLink', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanConductor', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'ConductorEndpoint', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'ConductorSplice', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'ComponentPin', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanWireGroup', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanCable', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanSignalDefinition', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanNet', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'MateRelationship', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'DeviceGroup', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'BomEntry', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'BomEntrySpec', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanPage', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'EndpointTermination', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanLinkAccessory', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'PlanAssemblyRef', file: 'src/interfaces/planInterfaces.ts' },
  { type: 'VisualGroup', file: 'src/interfaces/planInterfaces.ts' },
  // Harness types (harnessInterfaces.ts)
  { type: 'WorkingHarness', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'WorkingData', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'Connection', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'ConnectionTermination', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'ExpandedBomItem', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'ConnectorSpec', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'WireSpec', file: 'src/interfaces/harnessInterfaces.ts' },
  { type: 'Part', file: 'src/interfaces/harnessInterfaces.ts' },
  // SVG editor types
  { type: 'PinTableEntry', file: 'src/commands/svg-editor/interfaces.ts' },
  { type: 'SvgEditorState', file: 'src/commands/svg-editor/interfaces.ts' },
];

console.log('Generating JSON Schema from PlanData interfaces...');

// Create a tsconfig that can resolve the frontend's src/* paths
const tsconfigPath = resolve(FRONTEND, 'tsconfig.json');

const schemas: Record<string, unknown> = {};
let totalDefs = 0;

for (const entry of TYPES_TO_EXTRACT) {
  const typeName = entry.type;
  const sourceFile = resolve(FRONTEND, entry.file);
  try {
    const generator = createGenerator({
      path: sourceFile,
      tsconfig: tsconfigPath,
      type: typeName,
      skipTypeCheck: true,
      additionalProperties: false,
    });

    const schema = generator.createSchema(typeName);
    schemas[typeName] = schema;
    const defCount = schema.definitions ? Object.keys(schema.definitions).length : 0;
    totalDefs += defCount;
    console.log(`  ✓ ${typeName} (${defCount} definitions)`);
  } catch (err) {
    console.error(`  ✗ ${typeName}: ${err instanceof Error ? err.message : err}`);
  }
}

// Combine into a single schema document
const combined = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  description: 'Auto-generated JSON Schema for Splice PlanData types. Generated from frontend/src/interfaces/planInterfaces.ts',
  generated_at: new Date().toISOString(),
  types: schemas,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(combined, null, 2));

console.log(`\n✓ Generated ${TYPES_TO_EXTRACT.length} type schemas (${totalDefs} total definitions)`);
console.log(`  Output: ${OUTPUT}`);
