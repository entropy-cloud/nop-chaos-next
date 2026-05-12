import { describe, expect, it } from 'vitest';
import { flowEditorTestUtils } from './utils';

const {
  createNode,
  normalizeEdge,
  createFlowStateSnapshot,
  getEdgeStyle,
  shouldRecordNodeChangeHistory,
  shouldRecordEdgeChangeHistory,
} = flowEditorTestUtils();

describe('flow editor helpers', () => {
  it('creates node with seeded type-specific config', () => {
    const node = createNode('task', { x: 120, y: 240 }, { label: '审批任务' });

    expect(node.type).toBe('task');
    expect(node.position).toEqual({ x: 120, y: 240 });
    expect(node.data.label).toBe('审批任务');
    expect(node.data.config).toMatchObject({ executor: 'service', timeout: '30s' });
  });

  it('normalizes edge with marker and style', () => {
    const edge = normalizeEdge({
      id: 'edge-1',
      source: 'start-1',
      target: 'task-1',
      data: { condition: '通过', lineStyle: 'dashed' },
    });

    expect(edge.type).toBe('flowEdge');
    expect(edge.markerEnd).toEqual({ type: 'arrowclosed' });
    expect(edge.style).toEqual({ strokeDasharray: '8 6' });
    expect(edge.data?.condition).toBe('通过');
  });

  it('returns undefined style for solid edges', () => {
    expect(getEdgeStyle('solid')).toBeUndefined();
    expect(getEdgeStyle('dotted')).toEqual({ strokeDasharray: '2 6' });
  });

  it('creates deep-cloned snapshots for history state', () => {
    const node = createNode('start', { x: 10, y: 20 });
    const edge = normalizeEdge({
      id: 'edge-2',
      source: 'start-1',
      target: 'end-1',
      data: { condition: '默认', lineStyle: 'solid' },
    });

    const snapshot = createFlowStateSnapshot([node], [edge]);

    snapshot.nodes[0].data.label = 'changed';
    snapshot.edges[0].data!.condition = 'changed';

    expect(node.data.label).not.toBe('changed');
    expect(edge.data?.condition).not.toBe('changed');
  });

  it('records node history only for meaningful changes', () => {
    expect(shouldRecordNodeChangeHistory([{ id: 'node-1', type: 'select', selected: true }])).toBe(
      false,
    );
    expect(
      shouldRecordNodeChangeHistory([
        { id: 'node-1', type: 'position', position: { x: 10, y: 10 }, dragging: true },
      ]),
    ).toBe(false);
    expect(
      shouldRecordNodeChangeHistory([
        { id: 'node-1', type: 'position', position: { x: 10, y: 10 }, dragging: false },
      ]),
    ).toBe(true);
  });

  it('records edge history only when edge data changes', () => {
    expect(shouldRecordEdgeChangeHistory([{ id: 'edge-1', type: 'select', selected: true }])).toBe(
      false,
    );
    expect(shouldRecordEdgeChangeHistory([{ id: 'edge-1', type: 'remove' }])).toBe(true);
  });
});
