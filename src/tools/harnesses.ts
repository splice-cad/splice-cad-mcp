import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpliceApiClient } from '../api/client.js';

// ── Summary helper ──────────────────────────────────────────────────────

interface HarnessSummary {
  connectors: Array<{ key: string; mpn: string; manufacturer: string; positions?: number }>;
  wires: Array<{ key: string; mpn: string; gauge?: number; color?: string }>;
  cables: Array<{ key: string; mpn: string; cores?: number }>;
  connections: Array<{ wire: string; end1: string; end2: string; length_mm?: number }>;
  total_parts: number;
  warnings: string[];
}

function formatTermination(term: Record<string, unknown> | undefined): string {
  if (!term) return '(unconnected)';
  if (term.type === 'connector_pin') return `${term.connector_instance}.${term.pin}`;
  if (term.type === 'cable_core') return `${term.cable_instance}.core${term.core_no}${term.shield ? '(shield)' : ''}`;
  if (term.type === 'flying_lead') return `flying_lead(${term.termination_type})`;
  return '(unknown)';
}

function summarizeHarness(wh: Record<string, unknown>): HarnessSummary {
  const bom = (wh.bom ?? {}) as Record<string, Record<string, unknown>>;
  const data = (wh.data ?? {}) as Record<string, unknown>;
  const mapping = (data.mapping ?? {}) as Record<string, Record<string, unknown>>;
  const warnings: string[] = [];

  const connectors: HarnessSummary['connectors'] = [];
  const wires: HarnessSummary['wires'] = [];
  const cables: HarnessSummary['cables'] = [];

  for (const [key, item] of Object.entries(bom)) {
    const part = (item.part ?? {}) as Record<string, unknown>;
    const spec = (part.spec ?? {}) as Record<string, unknown>;
    const kind = part.kind as string;

    if (kind === 'connector') {
      const connSpec = (spec.connector ?? {}) as Record<string, unknown>;
      connectors.push({
        key,
        mpn: (part.mpn as string) ?? '',
        manufacturer: (part.manufacturer as string) ?? '',
        positions: connSpec.positions as number | undefined,
      });
    } else if (kind === 'wire') {
      const wireSpec = (spec.wire ?? {}) as Record<string, unknown>;
      wires.push({
        key,
        mpn: (part.mpn as string) ?? '',
        gauge: wireSpec.awg as number | undefined,
        color: wireSpec.color as string | undefined,
      });
    } else if (kind === 'cable') {
      const cableSpec = (spec.cable ?? {}) as Record<string, unknown>;
      cables.push({
        key,
        mpn: (part.mpn as string) ?? '',
        cores: cableSpec.core_count as number | undefined,
      });
    }
  }

  const connections: HarnessSummary['connections'] = [];
  for (const [wireKey, conn] of Object.entries(mapping)) {
    connections.push({
      wire: wireKey,
      end1: formatTermination(conn.end1 as Record<string, unknown> | undefined),
      end2: formatTermination(conn.end2 as Record<string, unknown> | undefined),
      length_mm: conn.length_mm as number | undefined,
    });

    // Validate connection references
    const end1 = conn.end1 as Record<string, unknown> | undefined;
    const end2 = conn.end2 as Record<string, unknown> | undefined;
    if (!end1) warnings.push(`${wireKey}: end1 is not connected`);
    if (!end2) warnings.push(`${wireKey}: end2 is not connected`);
    if (end1?.type === 'connector_pin' && !bom[end1.connector_instance as string]) {
      warnings.push(`${wireKey}: end1 references non-existent connector ${end1.connector_instance}`);
    }
    if (end2?.type === 'connector_pin' && !bom[end2.connector_instance as string]) {
      warnings.push(`${wireKey}: end2 references non-existent connector ${end2.connector_instance}`);
    }
    if (!bom[wireKey]) {
      warnings.push(`${wireKey}: wire has a connection but no BOM entry`);
    }
  }

  // Check for BOM items with no connections
  for (const [key, item] of Object.entries(bom)) {
    const part = (item.part ?? {}) as Record<string, unknown>;
    if (part.kind === 'wire' && !mapping[key]) {
      warnings.push(`${key}: wire in BOM but has no connection`);
    }
  }

  return {
    connectors,
    wires,
    cables,
    connections,
    total_parts: Object.keys(bom).length,
    warnings,
  };
}

// ── Tool registration ───────────────────────────────────────────────────

export function registerHarnessTools(server: McpServer, getClient: () => SpliceApiClient) {
  server.tool(
    'list_harnesses',
    'List all legacy harnesses owned by the authenticated user. These are standalone harnesses not associated with a project.',
    {},
    async () => {
      const harnesses = await getClient().listHarnesses();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(harnesses.map(h => ({
            id: h.id,
            name: h.name,
            description: h.description,
            modified_at: h.modified_at,
            project_id: h.project_id,
          })), null, 2),
        }],
      };
    },
  );

  server.tool(
    'create_harness',
    'Create a new legacy harness. Provide the full WorkingHarness JSON with BOM and connection data. Read the harness_schema resource first. Returns the harness with harness_id and revision_id set.',
    {
      harness_data: z.record(z.unknown()).describe('Complete WorkingHarness JSON object (see harness_schema resource)'),
    },
    async ({ harness_data }) => {
      const result = await getClient().saveNewHarness(harness_data);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            harness_id: result.harness_id,
            revision_id: result.revision_id,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_harness',
    'Load a legacy harness with its full BOM (hydrated parts) and connection data. Use this to inspect or modify an existing harness.',
    {
      harness_id: z.string().describe('Harness UUID'),
      revision: z.string().optional().describe('Revision label (e.g., "A", "B"). Defaults to latest.'),
    },
    async ({ harness_id, revision }) => {
      const wh = await getClient().loadHarness(harness_id, revision);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(wh, null, 2),
        }],
      };
    },
  );

  server.tool(
    'save_harness',
    'Save (overwrite) a legacy harness. The harness_data must include harness_id and revision_id from the loaded harness. Use get_harness first to load current state, modify it, then save.',
    {
      harness_id: z.string().describe('Harness UUID'),
      harness_data: z.record(z.unknown()).describe('Complete WorkingHarness JSON object'),
    },
    async ({ harness_id, harness_data }) => {
      const result = await getClient().saveHarness(harness_id, harness_data);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            harness_id: result.harness_id,
            revision_id: result.revision_id,
            last_modified_at: result.last_modified_at,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_harness_summary',
    'Get a structured summary of a legacy harness: connectors, wires, cables, connections, and validation warnings. More concise than get_harness.',
    {
      harness_id: z.string().describe('Harness UUID'),
    },
    async ({ harness_id }) => {
      const wh = await getClient().loadHarness(harness_id);
      const summary = summarizeHarness(wh);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      };
    },
  );
}
