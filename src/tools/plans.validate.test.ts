import { describe, it, expect } from 'vitest';
import { validatePlan } from './plans.js';
import type { PlanData } from '../types/plan.js';

// Minimal plan factory — only the fields validatePlan reads.
function plan(over: Partial<PlanData>): PlanData {
  return { nodes: {}, links: {}, conductors: {}, mates: [], ...over } as unknown as PlanData;
}

describe('validatePlan (structured findings)', () => {
  it('emits a structured finding with code + involved ids for a dangling bundle source', () => {
    const findings = validatePlan(
      plan({
        nodes: { n1: { id: 'n1', type: 'component', label: 'X1', position: { x: 0, y: 0 } } } as never,
        links: { l1: { id: 'l1', sourceNodeId: 'ghost', targetNodeId: 'n1' } } as never,
      }),
    );
    const bad = findings.find(f => f.code === 'BUNDLE_BAD_SOURCE');
    expect(bad).toBeTruthy();
    expect(bad!.severity).toBe('error');
    expect(bad!.involvedLinkIds).toEqual(['l1']);
    expect(bad!.involvedNodeIds).toEqual(['ghost']);
    // Human message preserved for back-compat.
    expect(bad!.message).toContain('non-existent source node ghost');
  });

  it('flags a conductor with no linkPath as a warning carrying its conductor id', () => {
    const findings = validatePlan(
      plan({
        conductors: { c1: { id: 'c1', linkPath: [] } } as never,
      }),
    );
    const f = findings.find(x => x.code === 'CONDUCTOR_NO_LINKPATH');
    expect(f).toBeTruthy();
    expect(f!.severity).toBe('warning');
    expect(f!.involvedConductorIds).toEqual(['c1']);
  });

  it('returns [] for a structurally clean empty plan', () => {
    expect(validatePlan(plan({}))).toEqual([]);
  });
});
