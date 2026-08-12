import { describe, it, expect } from 'vitest';
import { validateCommandParams } from './commands.js';

describe('validateCommandParams', () => {
  it('flags a missing required param with an actionable message (Herb\'s case)', () => {
    const err = validateCommandParams('UpdateNodeCommand', { nodeId: 'comp_1' });
    expect(err).toBeTruthy();
    expect(err).toContain('newValues');
    expect(err).toContain('UpdateNodeCommand');
  });

  it('passes when all required params are present', () => {
    expect(
      validateCommandParams('UpdateNodeCommand', { nodeId: 'comp_1', newValues: { label: 'X9' } }),
    ).toBeNull();
  });

  it('does not flag optional arrays as missing (page assignment)', () => {
    // nodeIds/linkIds are optional in the contract — only pageId is required.
    expect(validateCommandParams('AssignToPageCommand', { pageId: 'page_1' })).toBeNull();
  });

  it('does not reject extra/unexpected keys (bridge ignores them)', () => {
    expect(
      validateCommandParams('UpdateNodeCommand', {
        nodeId: 'comp_1',
        newValues: { label: 'X9' },
        stray: true,
      }),
    ).toBeNull();
  });

  it('passes through commands not captured in the contract', () => {
    expect(validateCommandParams('SomeFutureUnparsedCommand', {})).toBeNull();
  });

  it('never validates undo/redo sentinels', () => {
    expect(validateCommandParams('__undo', {})).toBeNull();
    expect(validateCommandParams('__redo', {})).toBeNull();
  });

  it('reports the wrong key name when the model guesses (updates vs newValues)', () => {
    const err = validateCommandParams('UpdateNodeCommand', { nodeId: 'comp_1', updates: { label: 'X9' } });
    expect(err).toContain('newValues'); // tells them the real required key
    expect(err).toContain('updates'); // echoes what they provided
  });

  it('rejects an AddLinkCommand link missing nested required fields (orphan-bundle footgun)', () => {
    const err = validateCommandParams('AddLinkCommand', { link: { id: 'l1' } });
    expect(err).toBeTruthy();
    expect(err).toContain('sourceNodeId');
    expect(err).toContain('targetNodeId');
    expect(err).toContain('link');
  });

  it('passes an AddLinkCommand with a fully-anchored link', () => {
    expect(
      validateCommandParams('AddLinkCommand', {
        link: { id: 'l1', sourceNodeId: 'a', targetNodeId: 'b' },
      }),
    ).toBeNull();
  });
});
