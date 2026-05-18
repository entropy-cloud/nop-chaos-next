import type { OrderRecord } from '../../../services/mockApi';
import type {
  MasterDetailFiltersState,
  MasterDetailListResult,
  MasterDetailPaginationState,
  MasterDetailSortState,
} from './listTypes';

function matchesKeyword(row: OrderRecord, keyword: string) {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase();
  return [row.orderNo, row.customerName, row.owner].some((value) =>
    value.toLowerCase().includes(normalizedKeyword),
  );
}

function matchesDateRange(value: string, dateFrom: string, dateTo: string) {
  const createdAt = new Date(value);

  if (dateFrom && createdAt < new Date(dateFrom)) {
    return false;
  }

  if (dateTo && createdAt > new Date(dateTo)) {
    return false;
  }

  return true;
}

export function filterAndSortOrders(
  rows: OrderRecord[],
  filters: MasterDetailFiltersState,
  sort: MasterDetailSortState,
) {
  const filteredRows = rows.filter((row) => {
    const matchesStatus = filters.status === 'all' || row.status === filters.status;
    const matchesChannel = !filters.channel || row.channel.includes(filters.channel);
    const matchesOwner =
      !filters.owner || row.owner.toLowerCase().includes(filters.owner.toLowerCase());

    return (
      matchesKeyword(row, filters.keyword) &&
      matchesStatus &&
      matchesChannel &&
      matchesOwner &&
      matchesDateRange(row.createdAt, filters.dateFrom, filters.dateTo)
    );
  });

  filteredRows.sort((a, b) => {
    const direction = sort.sortOrder === 'asc' ? 1 : -1;
    const aValue = a[sort.sortKey];
    const bValue = b[sort.sortKey];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction;
    }

    return String(aValue).localeCompare(String(bValue)) * direction;
  });

  return filteredRows;
}

export function paginateOrders(rows: OrderRecord[], pagination: MasterDetailPaginationState) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pagination.pageSize));
  const safePage = Math.min(pagination.page, pageCount);
  const pagedRows = rows.slice(
    (safePage - 1) * pagination.pageSize,
    safePage * pagination.pageSize,
  );

  return {
    pagedRows,
    pageCount,
  };
}

export function buildMasterDetailListState(
  sourceRows: OrderRecord[],
  filters: MasterDetailFiltersState,
  sort: MasterDetailSortState,
  pagination: MasterDetailPaginationState,
): MasterDetailListResult {
  const rows = filterAndSortOrders(sourceRows, filters, sort);
  const { pagedRows, pageCount } = paginateOrders(rows, pagination);

  return {
    rows,
    pagedRows,
    pageCount,
  };
}
