import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./shared', () => ({
  wait: (value: unknown) => Promise.resolve(value),
  clone: <T>(v: T): T => structuredClone(v),
  readStoredJson: vi.fn(),
  writeStoredJson: vi.fn(),
}));

import { readStoredJson, writeStoredJson } from './shared';

describe('mockApi/dashboard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fetchDashboardData returns metrics and chart data for today', async () => {
    const { fetchDashboardData } = await import('./dashboard');
    const data = await fetchDashboardData('today');

    expect(data.metrics).toHaveLength(4);
    expect(data.trend).toHaveLength(1);
    expect(data.combo.length).toBeGreaterThanOrEqual(7);
    expect(data.stacked.length).toBeGreaterThanOrEqual(7);
    expect(data.radar).toHaveLength(6);
    expect(data.categories).toHaveLength(5);
    expect(data.events.length).toBeGreaterThanOrEqual(4);
  });

  it('fetchDashboardData returns 30 days for 30d range', async () => {
    const { fetchDashboardData } = await import('./dashboard');
    const data = await fetchDashboardData('30d');

    expect(data.trend).toHaveLength(30);
    expect(data.metrics[0].id).toBe('requests');
    expect(data.metrics[1].id).toBe('success-rate');
    expect(data.metrics[2].id).toBe('latency');
    expect(data.metrics[3].id).toBe('sessions');
  });

  it('fetchDashboardData returns 7 days for 7d range', async () => {
    const { fetchDashboardData } = await import('./dashboard');
    const data = await fetchDashboardData('7d');

    expect(data.trend).toHaveLength(7);
  });

  it('fetchDashboardData defaults to 7d for custom range without dates', async () => {
    const { fetchDashboardData } = await import('./dashboard');
    const data = await fetchDashboardData('custom');

    expect(data.trend).toHaveLength(7);
  });

  it('fetchDashboardData handles custom date range', async () => {
    const { fetchDashboardData } = await import('./dashboard');
    const data = await fetchDashboardData('custom', '2026-03-20', '2026-03-24');

    expect(data.trend.length).toBeLessThanOrEqual(5);
    expect(data.trend.length).toBeGreaterThanOrEqual(1);
  });

  it('metrics have positive/negative trends', async () => {
    const { fetchDashboardData } = await import('./dashboard');
    const data = await fetchDashboardData('7d');

    for (const metric of data.metrics) {
      expect(metric).toHaveProperty('id');
      expect(metric).toHaveProperty('label');
      expect(metric).toHaveProperty('value');
      expect(metric).toHaveProperty('trend');
      expect(metric).toHaveProperty('positive');
      expect(metric).toHaveProperty('comparison');
    }
  });
});

describe('mockApi/orders', () => {
  const seedOrders = [
    {
      id: '1001',
      orderNo: 'SO-TEST-1001',
      customerName: 'Test Corp',
      status: 'active' as const,
      owner: 'Alice',
      createdAt: '2026-03-25',
      updatedAt: '2026-03-30',
      amount: 10000,
      channel: 'direct',
      items: [],
      addresses: [],
      logistics: [],
    },
    {
      id: '1002',
      orderNo: 'SO-TEST-1002',
      customerName: 'Other Corp',
      status: 'draft' as const,
      owner: 'Bob',
      createdAt: '2026-03-26',
      updatedAt: '2026-03-30',
      amount: 5000,
      channel: 'online',
      items: [],
      addresses: [],
      logistics: [],
    },
  ];

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(readStoredJson).mockReturnValue(structuredClone(seedOrders));
    vi.mocked(writeStoredJson).mockReset();
  });

  it('fetchOrderList returns stored orders', async () => {
    const { fetchOrderList } = await import('./orders');
    const orders = await fetchOrderList();
    expect(orders).toHaveLength(2);
    expect(orders[0].id).toBe('1001');
  });

  it('fetchOrderDetail returns specific order', async () => {
    const { fetchOrderDetail } = await import('./orders');
    const order = await fetchOrderDetail('1002');
    expect(order.customerName).toBe('Other Corp');
  });

  it('fetchOrderDetail throws for missing order', async () => {
    const { fetchOrderDetail } = await import('./orders');
    await expect(fetchOrderDetail('nonexistent')).rejects.toThrow('Order not found');
  });

  it('saveOrderDetail updates existing order', async () => {
    const { saveOrderDetail } = await import('./orders');
    const updated = await saveOrderDetail({
      ...seedOrders[0],
      customerName: 'Updated Corp',
    });
    expect(updated.customerName).toBe('Updated Corp');
    expect(writeStoredJson).toHaveBeenCalled();
  });

  it('deleteOrders removes orders by id', async () => {
    const { deleteOrders } = await import('./orders');
    await deleteOrders(['1001']);
    const lastCall = vi.mocked(writeStoredJson).mock.calls.at(-1);
    const saved = lastCall![1] as unknown[];
    expect(saved).toHaveLength(1);
    expect((saved[0] as { id: string }).id).toBe('1002');
  });
});

describe('mockApi/flow', () => {
  const seedFlows = [
    {
      id: 'flow-1',
      name: 'Test Flow',
      description: 'A test flow',
      status: 'enabled' as const,
      createdAt: '2026-03-01',
      updatedAt: '2026-03-30',
      nodes: [],
      edges: [],
    },
  ];

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(readStoredJson).mockReturnValue(structuredClone(seedFlows));
    vi.mocked(writeStoredJson).mockReset();
  });

  it('fetchFlowList returns stored flows', async () => {
    const { fetchFlowList } = await import('./flow');
    const flows = await fetchFlowList();
    expect(flows).toHaveLength(1);
    expect(flows[0].id).toBe('flow-1');
  });

  it('fetchFlowDetail returns existing flow', async () => {
    const { fetchFlowDetail } = await import('./flow');
    const flow = await fetchFlowDetail('flow-1');
    expect(flow.name).toBe('Test Flow');
  });

  it('fetchFlowDetail throws for missing flow', async () => {
    const { fetchFlowDetail } = await import('./flow');
    await expect(fetchFlowDetail('flow-missing')).rejects.toThrow('Flow not found');
  });

  it('fetchFlowDetail creates new flow when id is "new"', async () => {
    const { fetchFlowDetail } = await import('./flow');
    const flow = await fetchFlowDetail('new');
    expect(flow.name).toBe('Untitled flow');
    expect(flow.status).toBe('draft');
    expect(flow.nodes).toHaveLength(2);
    expect(flow.edges).toHaveLength(1);
  });

  it('fetchFlowDetail throws when aborted before fetch', async () => {
    const { fetchFlowDetail } = await import('./flow');
    const controller = new AbortController();
    controller.abort();
    await expect(fetchFlowDetail('flow-1', controller.signal)).rejects.toThrow();
  });

  it('saveFlowDetail updates existing flow', async () => {
    const { saveFlowDetail } = await import('./flow');
    const saved = await saveFlowDetail({ ...seedFlows[0], name: 'Updated Flow' });
    expect(saved.name).toBe('Updated Flow');
    expect(writeStoredJson).toHaveBeenCalled();
  });

  it('saveFlowDetail appends new flow', async () => {
    const { saveFlowDetail } = await import('./flow');
    const newFlow = {
      id: 'flow-new',
      name: 'Brand New',
      description: '',
      status: 'draft' as const,
      createdAt: '',
      updatedAt: '',
      nodes: [],
      edges: [],
    };
    const saved = await saveFlowDetail(newFlow);
    expect(saved.name).toBe('Brand New');
    const stored = vi.mocked(writeStoredJson).mock.calls[0][1] as unknown[];
    expect(stored).toHaveLength(2);
  });

  it('deleteFlow removes flow by id', async () => {
    const { deleteFlow } = await import('./flow');
    await deleteFlow('flow-1');
    const lastCall = vi.mocked(writeStoredJson).mock.calls.at(-1);
    const stored = lastCall![1] as unknown[];
    expect(stored).toHaveLength(0);
  });
});

describe('mockApi/plugins', () => {
  const seedPlugins = [
    {
      id: 'plugins-demo',
      name: 'Plugin Demo',
      icon: 'blocks',
      description: 'Test plugin',
      version: '0.3.2',
      author: 'Team',
      source: 'Internal',
      enabled: true,
      url: '/plugins/plugin-demo.system.js',
      updatedAt: '2026-03-15',
      configSchema: [],
      settings: {},
    },
  ];

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(readStoredJson).mockReturnValue(structuredClone(seedPlugins));
  });

  it('fetchPluginList returns seeded manifests', async () => {
    const { fetchPluginList } = await import('./plugins');
    const plugins = await fetchPluginList();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].id).toBe('plugins-demo');
  });

  it('getPluginSeeds returns default seeds', async () => {
    const { getPluginSeeds } = await import('./plugins');
    const seeds = getPluginSeeds();
    expect(seeds[0].enabled).toBe(true);
  });

  it('persistPluginSeeds writes to storage', async () => {
    const { persistPluginSeeds } = await import('./plugins');
    persistPluginSeeds(seedPlugins);
    expect(writeStoredJson).toHaveBeenCalled();
  });
});

describe('mockApi/aiWorkbench', () => {
  it('createMockAiReply returns general prefix for default assistant', async () => {
    const { createMockAiReply } = await import('./aiWorkbench');
    const reply = createMockAiReply('test question', 'general', false, '');
    expect(reply).toContain('以下是整理后的答复');
    expect(reply).toContain('test question');
    expect(reply).not.toContain('已附带上下文');
  });

  it('createMockAiReply returns analysis prefix', async () => {
    const { createMockAiReply } = await import('./aiWorkbench');
    const reply = createMockAiReply('analyze', 'analysis', false, '');
    expect(reply).toContain('以下是基于数据视角的建议');
  });

  it('createMockAiReply returns flow prefix', async () => {
    const { createMockAiReply } = await import('./aiWorkbench');
    const reply = createMockAiReply('flow question', 'flow', false, '');
    expect(reply).toContain('以下是流程编排层面的建议');
  });

  it('createMockAiReply includes context when flag is true', async () => {
    const { createMockAiReply } = await import('./aiWorkbench');
    const reply = createMockAiReply('q', 'general', true, 'ctx summary');
    expect(reply).toContain('已附带上下文：ctx summary');
  });

  it('createMockAiReply handles empty prompt', async () => {
    const { createMockAiReply } = await import('./aiWorkbench');
    const reply = createMockAiReply('', 'general', false, '');
    expect(reply).toContain('未提供明确问题');
  });

  it('exports assistantCatalog with 3 assistants', async () => {
    const { assistantCatalog } = await import('./aiWorkbench');
    expect(assistantCatalog).toHaveLength(3);
    expect(assistantCatalog.map((a) => a.id)).toEqual(['general', 'analysis', 'flow']);
  });

  it('exports seedWorkbenchSessions', async () => {
    const { seedWorkbenchSessions } = await import('./aiWorkbench');
    expect(seedWorkbenchSessions.length).toBeGreaterThanOrEqual(1);
    expect(seedWorkbenchSessions[0].messages.length).toBeGreaterThan(0);
  });
});
