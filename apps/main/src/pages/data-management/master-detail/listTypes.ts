import type { OrderRecord } from '../../../services/mockApi';

export type SortKey = 'orderNo' | 'customerName' | 'status' | 'createdAt' | 'updatedAt' | 'amount';
export type StatusFilter = 'all' | 'active' | 'review' | 'draft' | 'closed';

export interface MasterDetailFiltersState {
  keyword: string;
  status: StatusFilter;
  channel: string;
  owner: string;
  dateFrom: string;
  dateTo: string;
}

export interface MasterDetailSortState {
  sortKey: SortKey;
  sortOrder: 'asc' | 'desc';
}

export interface MasterDetailPaginationState {
  page: number;
  pageSize: number;
}

export interface MasterDetailListState
  extends MasterDetailFiltersState,
    MasterDetailSortState,
    MasterDetailPaginationState {}

export interface MasterDetailListResult {
  rows: OrderRecord[];
  pagedRows: OrderRecord[];
  pageCount: number;
}
