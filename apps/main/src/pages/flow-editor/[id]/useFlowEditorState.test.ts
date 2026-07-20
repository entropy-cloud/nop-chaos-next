import { describe, expect, it } from 'vitest';

function isDirty(
  initialized: boolean,
  nodes: unknown[],
  edges: unknown[],
  savedSnapshot: string,
): boolean {
  if (!initialized) return false;
  return JSON.stringify({ nodes, edges }) !== savedSnapshot;
}

describe('dirty detection semantics', () => {
  const sampleNodes = [
    { id: 'n1', type: 'task', position: { x: 0, y: 0 }, data: { label: 'Test' } },
  ];
  const sampleEdges = [{ id: 'e1', source: 'n1', target: 'n2' }];
  const sampleSnapshot = JSON.stringify({ nodes: sampleNodes, edges: sampleEdges });

  it('returns false when not initialized (loaded state)', () => {
    expect(isDirty(false, sampleNodes, sampleEdges, sampleSnapshot)).toBe(false);
  });

  it('returns false when initialized and snapshot matches (saved state)', () => {
    expect(isDirty(true, sampleNodes, sampleEdges, sampleSnapshot)).toBe(false);
  });

  it('returns true when node position changes (modified state)', () => {
    const movedNodes = [
      { ...sampleNodes[0], position: { x: 100, y: 100 } },
    ];
    expect(isDirty(true, movedNodes, sampleEdges, sampleSnapshot)).toBe(true);
  });

  it('returns true when node is added (modified state)', () => {
    const extraNodes = [
      ...sampleNodes,
      { id: 'n2', type: 'end', position: { x: 200, y: 200 }, data: { label: 'End' } },
    ];
    expect(isDirty(true, extraNodes, sampleEdges, sampleSnapshot)).toBe(true);
  });

  it('returns true when edge is added (modified state)', () => {
    const extraEdges = [
      ...sampleEdges,
      { id: 'e2', source: 'n2', target: 'n3' },
    ];
    expect(isDirty(true, sampleNodes, extraEdges, sampleSnapshot)).toBe(true);
  });

  it('returns false after save (saved state)', () => {
    const modifiedNodes = [
      { ...sampleNodes[0], position: { x: 100, y: 100 } },
    ];
    const newSnapshot = JSON.stringify({ nodes: modifiedNodes, edges: sampleEdges });
    expect(isDirty(true, modifiedNodes, sampleEdges, newSnapshot)).toBe(false);
  });
});
