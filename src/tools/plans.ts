import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SpliceApiClient } from '../api/client.js';
import type { PlanData, PlanNode, PlanConductor } from '../types/plan.js';
import { normalizeColorToHex, normalizeColorToName } from '../utils/colors.js';

/**
 * Fix all conductor and BOM colors in a plan to use standard values.
 * Conductors use hex, BOM specs use names.
 * Returns list of corrections made.
 */
function fixPlanColors(plan: PlanData): string[] {
  const fixes: string[] = [];

  // Fix conductor colors (should be hex)
  for (const cond of Object.values(plan.conductors ?? {})) {
    for (const field of ['color', 'stripe'] as const) {
      const raw = cond[field];
      if (!raw) continue;
      const fixed = normalizeColorToHex(raw);
      if (fixed === null) {
        fixes.push(`Conductor ${cond.id}: invalid ${field} "${raw}" — removed (not a standard wire color)`);
        delete cond[field];
      } else if (fixed !== raw) {
        fixes.push(`Conductor ${cond.id}: corrected ${field} "${raw}" → "${fixed}"`);
        (cond as unknown as Record<string, unknown>)[field] = fixed;
      }
    }
  }

  // Fix BOM entry spec colors (should be names)
  for (const bom of plan.bom ?? []) {
    if (!bom.spec) continue;
    for (const field of ['color', 'stripe'] as const) {
      const raw = bom.spec[field] as string | undefined;
      if (!raw) continue;
      const fixed = normalizeColorToName(raw);
      if (fixed === null) {
        fixes.push(`BOM ${bom.id} (${bom.mpn}): invalid spec.${field} "${raw}" — removed`);
        delete bom.spec[field];
      } else if (fixed !== raw) {
        fixes.push(`BOM ${bom.id} (${bom.mpn}): corrected spec.${field} "${raw}" → "${fixed}"`);
        (bom.spec as Record<string, unknown>)[field] = fixed;
      }
    }
  }

  return fixes;
}

// ── Summary types ───────────────────────────────────────────────────────

interface ComponentSummary {
  id: string;
  label: string;
  name?: string;
  pin_count: number;
  pins?: Array<{ id: string; label: string; function?: string; connected: boolean }>;
  has_part: boolean;
  mpn?: string;
  category?: string;
  position: { x: number; y: number };
}

interface BranchPointSummary {
  id: string;
  label: string;
  position: { x: number; y: number };
}

interface BundleSummary {
  id: string;
  from: string;
  to: string;
  from_id: string;
  to_id: string;
  conductor_count: number;
  length_mm?: number;
}

interface ConductorSummary {
  id: string;
  net: string;
  gauge?: string;
  color?: string;
  from: string;
  to: string;
}

interface PlanSummary {
  components: ComponentSummary[];
  branch_points: BranchPointSummary[];
  bundles: BundleSummary[];
  conductors: ConductorSummary[];
  conductor_count: number;
  unconnected_pins: string[];
  warnings: string[];
}

// ── Summarize + validate helpers ────────────────────────────────────────

function summarizePlan(plan: PlanData): PlanSummary {
  const nodes = Object.values(plan.nodes ?? {});
  const links = Object.values(plan.links ?? {});
  const conductors = Object.values(plan.conductors ?? {});

  // Build pin usage set
  const usedPins = new Set<string>();
  for (const c of conductors) {
    if (c.startEndpoint?.pinId) usedPins.add(`${c.startEndpoint.nodeId}:${c.startEndpoint.pinId}`);
    if (c.endEndpoint?.pinId) usedPins.add(`${c.endEndpoint.nodeId}:${c.endEndpoint.pinId}`);
  }

  // Find unconnected pins
  const unconnected: string[] = [];
  for (const node of nodes) {
    if (node.type !== 'component' || !node.pins) continue;
    for (const pin of node.pins) {
      if (!usedPins.has(`${node.id}:${pin.id}`)) {
        unconnected.push(`${node.label}:${pin.label}`);
      }
    }
  }

  // Resolve BOM mpn for components
  const bomById = new Map<string, { mpn: string }>();
  for (const entry of plan.bom ?? []) {
    bomById.set(entry.id, { mpn: entry.mpn });
  }

  // Format endpoint for conductor summary
  const fmtEp = (ep: { nodeId: string; pinId?: string } | undefined): string => {
    if (!ep) return '?';
    const node = plan.nodes[ep.nodeId];
    const label = node?.label ?? ep.nodeId;
    if (!ep.pinId) return label;
    const pin = node?.pins?.find(p => p.id === ep.pinId);
    return `${label}.${pin?.label ?? ep.pinId}`;
  };

  return {
    components: nodes
      .filter((n): n is PlanNode & { type: 'component' } => n.type === 'component')
      .map(n => ({
        id: n.id,
        label: n.label,
        name: n.name,
        pin_count: n.pins?.length ?? 0,
        pins: n.pins?.map(p => ({
          id: p.id,
          label: p.label,
          function: p.function,
          connected: usedPins.has(`${n.id}:${p.id}`),
        })),
        has_part: !!n.bomEntryId,
        mpn: n.bomEntryId ? bomById.get(n.bomEntryId)?.mpn : undefined,
        category: n.category,
        position: n.position,
      })),
    branch_points: nodes
      .filter(n => n.type === 'branch_point')
      .map(n => ({ id: n.id, label: n.label, position: n.position })),
    bundles: links.map(l => ({
      id: l.id,
      from: plan.nodes[l.sourceNodeId]?.label ?? l.sourceNodeId,
      to: plan.nodes[l.targetNodeId]?.label ?? l.targetNodeId,
      from_id: l.sourceNodeId,
      to_id: l.targetNodeId,
      conductor_count: conductors.filter(c => c.linkPath?.includes(l.id)).length,
      length_mm: l.length_mm,
    })),
    conductors: conductors.map(c => ({
      id: c.id,
      net: c.netName,
      gauge: c.gauge,
      color: c.color,
      from: fmtEp(c.startEndpoint),
      to: fmtEp(c.endEndpoint),
    })),
    conductor_count: conductors.length,
    unconnected_pins: unconnected,
    warnings: validatePlan(plan),
  };
}

function validatePlan(plan: PlanData): string[] {
  const warnings: string[] = [];
  const nodes = plan.nodes ?? {};
  const links = plan.links ?? {};
  const conductors = Object.values(plan.conductors ?? {});

  // Check for orphan nodes (no links connected)
  const linkedNodeIds = new Set<string>();
  for (const link of Object.values(links)) {
    linkedNodeIds.add(link.sourceNodeId);
    linkedNodeIds.add(link.targetNodeId);
  }
  for (const node of Object.values(nodes)) {
    if (!linkedNodeIds.has(node.id) && Object.keys(links).length > 0) {
      warnings.push(`${node.label} is not connected to any bundle.`);
    }
  }

  // Check conductors reference valid nodes and pins
  for (const cond of conductors) {
    for (const ep of [cond.startEndpoint, cond.endEndpoint]) {
      if (!ep?.nodeId) continue;
      const node = nodes[ep.nodeId];
      if (!node) {
        warnings.push(`Conductor ${cond.id} references non-existent node ${ep.nodeId}.`);
        continue;
      }
      if (ep.pinId && node.type === 'component') {
        const pin = node.pins?.find(p => p.id === ep.pinId);
        if (!pin) {
          warnings.push(`Conductor ${cond.id} references non-existent pin ${ep.pinId} on ${node.label}.`);
        }
      }
    }

    // Check linkPath references valid links
    if (cond.linkPath) {
      for (const linkId of cond.linkPath) {
        if (!links[linkId]) {
          warnings.push(`Conductor ${cond.id} references non-existent link ${linkId} in linkPath.`);
        }
      }
    }

    // Check conductor has linkPath
    if (!cond.linkPath || cond.linkPath.length === 0) {
      warnings.push(`Conductor ${cond.id} has no linkPath — it won't appear on any bundle.`);
    }
  }

  // Check links reference valid nodes
  for (const link of Object.values(links)) {
    if (!nodes[link.sourceNodeId]) {
      warnings.push(`Bundle ${link.id} references non-existent source node ${link.sourceNodeId}.`);
    }
    if (!nodes[link.targetNodeId]) {
      warnings.push(`Bundle ${link.id} references non-existent target node ${link.targetNodeId}.`);
    }
  }

  // Check for components without parts
  for (const node of Object.values(nodes)) {
    if (node.type === 'component' && !node.bomEntryId) {
      warnings.push(`${node.label} has no part assigned.`);
    }
  }

  return warnings;
}

// ── Tool registration ───────────────────────────────────────────────────

export function registerPlanTools(server: McpServer, getClient: () => SpliceApiClient) {
  server.tool(
    'get_plan',
    'Get PlanData for a project. WARNING: Can be very large for complex plans. PREFER get_plan_summary to understand plan state. Use node_ids/link_ids to fetch specific elements instead of the full plan.',
    {
      project_id: z.string().describe('Project UUID'),
      node_ids: z.array(z.string()).optional().describe('Only return these specific nodes (by ID). Omit for all.'),
      link_ids: z.array(z.string()).optional().describe('Only return these specific links (by ID). Omit for all.'),
      conductor_ids: z.array(z.string()).optional().describe('Only return these specific conductors (by ID). Omit for all.'),
      include_bom: z.boolean().default(true).describe('Include BOM entries'),
      include_nets: z.boolean().default(true).describe('Include nets/signals'),
    },
    async ({ project_id, node_ids, link_ids, conductor_ids, include_bom, include_nets }) => {
      const plan = await getClient().getPlan(project_id);
      const doc = plan.doc as unknown as PlanData;

      // If no filters, return full plan but strip bulky view-only data
      const hasFilter = node_ids || link_ids || conductor_ids;

      if (!hasFilter) {
        // Strip view state and page geometry to reduce size
        const { viewState, nodePagePositions, nodePageSizes, linkPageGeometry, nodePageHideEmptyPins, ...structural } = doc as PlanData & Record<string, unknown>;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(structural, null, 2),
          }],
        };
      }

      // Filtered response — only requested elements
      const result: Record<string, unknown> = {};

      if (node_ids) {
        const nodes: Record<string, unknown> = {};
        for (const id of node_ids) {
          if (doc.nodes[id]) nodes[id] = doc.nodes[id];
        }
        result.nodes = nodes;
      }

      if (link_ids) {
        const links: Record<string, unknown> = {};
        for (const id of link_ids) {
          if (doc.links[id]) links[id] = doc.links[id];
        }
        result.links = links;
      }

      if (conductor_ids) {
        const conductors: Record<string, unknown> = {};
        for (const id of conductor_ids) {
          if (doc.conductors?.[id]) conductors[id] = doc.conductors[id];
        }
        result.conductors = conductors;
      }

      if (include_bom) result.bom = doc.bom;
      if (include_nets) { result.nets = doc.nets; result.signals = doc.signals; }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );

  server.tool(
    'save_plan',
    'Save (overwrite) the PlanData JSON for a project. The plan_data must be a complete, valid PlanData object. Read the plan_schema resource first to understand the structure. Use get_plan to fetch the current state before modifying.',
    {
      project_id: z.string().describe('Project UUID'),
      plan_data: z.record(z.unknown()).describe('Complete PlanData JSON object'),
    },
    async ({ project_id, plan_data }) => {
      const plan = plan_data as unknown as PlanData;

      // Auto-fix colors before saving
      const colorFixes = fixPlanColors(plan);

      const result = await getClient().savePlan(project_id, plan);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            generation: result.generation,
            modified_at: result.modified_at,
            ...(colorFixes.length > 0 ? { color_corrections: colorFixes } : {}),
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'get_plan_summary',
    'PREFERRED way to read plan state. Returns components (with positions, pins, connection status, MPN), bundles, conductors, branch points, unconnected pins, and warnings. Much smaller than get_plan — use this first, only fetch full plan if you need raw data for specific elements.',
    {
      project_id: z.string().describe('Project UUID'),
    },
    async ({ project_id }) => {
      const plan = await getClient().getPlan(project_id);
      const summary = summarizePlan(plan.doc as unknown as PlanData);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      };
    },
  );

  server.tool(
    'validate_plan',
    'Validate a project\'s plan for structural issues: orphan nodes, dangling conductors, missing parts, invalid references. Returns a list of warnings.',
    {
      project_id: z.string().describe('Project UUID'),
    },
    async ({ project_id }) => {
      const plan = await getClient().getPlan(project_id);
      const warnings = validatePlan(plan.doc as unknown as PlanData);
      return {
        content: [{
          type: 'text' as const,
          text: warnings.length === 0
            ? 'Plan is valid — no issues found.'
            : `Found ${warnings.length} issue(s):\n${warnings.map(w => `• ${w}`).join('\n')}`,
        }],
      };
    },
  );
}
