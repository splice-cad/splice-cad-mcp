import { describe, it, expect } from 'vitest';
import { expandType, resolveTypeName, missingNestedRequired } from './typeSchema.js';

describe('resolveTypeName', () => {
  it('returns undefined for empty/union-of-nullish', () => {
    expect(resolveTypeName(undefined)).toBeUndefined();
    expect(resolveTypeName('null | undefined')).toBeUndefined();
  });
  it('strips nullable unions to the real type', () => {
    expect(resolveTypeName('PlanLink | null')).toEqual({ name: 'PlanLink', isArray: false });
    expect(resolveTypeName('string | null')).toEqual({ name: 'string', isArray: false });
  });
  it('detects arrays (T[] and Array<T>)', () => {
    expect(resolveTypeName('BulkMateEntry[]')).toEqual({ name: 'BulkMateEntry', isArray: true });
    expect(resolveTypeName('Array<PlanNode>')).toEqual({ name: 'PlanNode', isArray: true });
  });
});

describe('expandType', () => {
  it('expands a known domain type to its fields, marking required ones', () => {
    const fields = expandType('PlanLink');
    expect(fields).toBeTruthy();
    const byName = Object.fromEntries(fields!.map(f => [f.name, f]));
    expect(byName.id.required).toBe(true);
    expect(byName.sourceNodeId).toEqual({ name: 'sourceNodeId', type: 'string', required: true });
    expect(byName.targetNodeId.required).toBe(true);
    // an optional field is present but not required
    expect(byName.length_mm.required).toBe(false);
  });
  it('expands the element type for arrays', () => {
    expect(expandType('PlanLink[]')).toBeTruthy();
  });
  it('returns undefined for primitives and unknown types', () => {
    expect(expandType('string')).toBeUndefined();
    expect(expandType('AddMateOptions')).toBeUndefined(); // command-option type, not in plan schema
    expect(expandType(undefined)).toBeUndefined();
  });
});

describe('missingNestedRequired', () => {
  it('flags required sub-fields missing from an object value', () => {
    expect(missingNestedRequired('PlanLink', { id: 'l1' })).toEqual(
      expect.arrayContaining(['sourceNodeId', 'targetNodeId']),
    );
  });
  it('passes a complete object', () => {
    expect(
      missingNestedRequired('PlanLink', { id: 'l1', sourceNodeId: 'a', targetNodeId: 'b' }),
    ).toEqual([]);
  });
  it('is conservative: never fires for unknown types, arrays, or non-objects', () => {
    expect(missingNestedRequired('string', 'x')).toEqual([]);
    expect(missingNestedRequired('PlanLink[]', [{ id: 'l1' }])).toEqual([]);
    expect(missingNestedRequired('PlanLink', undefined)).toEqual([]);
    expect(missingNestedRequired('PlanLink', null)).toEqual([]);
  });
});
