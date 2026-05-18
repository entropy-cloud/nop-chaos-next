import { describe, expect, it } from 'vitest';
import { buildMasterDetailListState } from './listState';
import type { OrderRecord } from '../../../services/mockApi';

const rows: OrderRecord[] = [
  {
    id: '1',
    orderNo: 'SO-1001',
    customerName: 'Alice Corp',
    status: 'active',
    amount: 5000,
    owner: 'Alice',
    channel: 'Online',
    createdAt: '2026-05-01',
    updatedAt: '2026-05-03',
    items: [],
    addresses: [],
    logistics: [],
  },
  {
    id: '2',
    orderNo: 'SO-1002',
    customerName: 'Beta Shop',
    status: 'review',
    amount: 2000,
    owner: 'Bob',
    channel: 'Retail',
    createdAt: '2026-05-10',
    updatedAt: '2026-05-12',
    items: [],
    addresses: [],
    logistics: [],
  },
  {
    id: '3',
    orderNo: 'SO-1003',
    customerName: 'Gamma Team',
    status: 'closed',
    amount: 9000,
    owner: 'Carol',
    channel: 'Online',
    createdAt: '2026-05-20',
    updatedAt: '2026-05-21',
    items: [],
    addresses: [],
    logistics: [],
  },
];

describe('master-detail detail filter matching', () => {
  it('filters by keyword, owner, channel, and date range together', () => {
    const result = buildMasterDetailListState(
      rows,
      {
        keyword: 'so-1001',
        status: 'all',
        channel: 'Online',
        owner: 'ali',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-05',
      },
      { sortKey: 'updatedAt', sortOrder: 'desc' },
      { page: 1, pageSize: 10 },
    );

    expect(result.rows.map((row) => row.id)).toEqual(['1']);
  });

  it('sorts and paginates rows deterministically', () => {
    const result = buildMasterDetailListState(
      rows,
      {
        keyword: '',
        status: 'all',
        channel: '',
        owner: '',
        dateFrom: '',
        dateTo: '',
      },
      { sortKey: 'amount', sortOrder: 'desc' },
      { page: 2, pageSize: 1 },
    );

    expect(result.rows.map((row) => row.id)).toEqual(['3', '1', '2']);
    expect(result.pagedRows.map((row) => row.id)).toEqual(['1']);
    expect(result.pageCount).toBe(3);
  });
});
