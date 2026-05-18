import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, toast } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/common/PageHeader';
import { confirmInApp } from '../../../services/confirm';
import { deleteOrders, fetchOrderList, type OrderRecord } from '../../../services/mockApi';
import { useTabStore } from '../../../store/tabStore';
import { MasterDetailFilters } from './components/MasterDetailFilters';
import { MasterDetailTable } from './components/MasterDetailTable';
import { buildMasterDetailListState } from './listState';
import type { SortKey, StatusFilter } from './listTypes';

export default function MasterDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);
  const orderQuery = useQuery({ queryKey: ['orders'], queryFn: fetchOrderList });
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await deleteOrders(ids);
    },
    onSuccess: () => {
      setSelectedIds([]);
      void orderQuery.refetch();
      toast.success(t('masterDetail.batchDeleteSuccess'));
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : t('masterDetail.batchDelete'));
    },
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [channel, setChannel] = useState('');
  const [owner, setOwner] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { rows, pagedRows, pageCount } = useMemo(
    () =>
      buildMasterDetailListState(
        orderQuery.data ?? [],
        { keyword, status, channel, owner, dateFrom, dateTo },
        { sortKey, sortOrder },
        { page, pageSize },
      ),
    [channel, dateFrom, dateTo, keyword, orderQuery.data, owner, page, pageSize, sortKey, sortOrder, status],
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((state) =>
      state.includes(id) ? state.filter((item) => item !== id) : [...state, id],
    );
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    if (
      !(await confirmInApp(t('masterDetail.batchDeleteConfirm', { count: selectedIds.length }), {
        destructive: true,
      }))
    ) {
      return;
    }
    deleteMutation.mutate(selectedIds);
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast.info(t('masterDetail.exportSelectHint'));
      return;
    }
    if (!(await confirmInApp(t('masterDetail.exportConfirm', { count: selectedIds.length })))) {
      return;
    }
    const data = rows.filter((row) => selectedIds.includes(row.id));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orders-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const changeSort = (key: SortKey) => {
    setSortKey(key);
    setSortOrder((current) => (sortKey === key ? (current === 'asc' ? 'desc' : 'asc') : 'desc'));
  };

  const handleDeleteRow = async (row: OrderRecord) => {
    if (
      !(await confirmInApp(t('masterDetail.rowDeleteConfirm', { orderNo: row.orderNo }), {
        destructive: true,
      }))
    ) {
      return;
    }
    deleteMutation.mutate([row.id], {
      onSuccess: () => {
        toast.success(t('masterDetail.rowDeleteSuccess'));
      },
    });
  };

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setChannel('');
    setOwner('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const openDetail = (row: OrderRecord) => {
    openTab({
      path: `/data-management/master-detail/${row.id}`,
      title: `${row.orderNo} · ${row.customerName}`,
      icon: 'table',
      closable: true,
    });
    navigate(`/data-management/master-detail/${row.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="gap-2"
        eyebrow={t('masterDetail.eyebrow')}
        title={t('masterDetail.title')}
        description={t('masterDetail.listDescription')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void orderQuery.refetch()}>
              <RefreshCw className="size-4" />
              {t('common.refresh')}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4" />
              {t('masterDetail.batchExport')}
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete} disabled={deleteMutation.isPending}>
              <Trash2 className="size-4" />
              {t('masterDetail.batchDelete')}
            </Button>
          </div>
        }
      />

      {orderQuery.isLoading ? <div className="text-sm text-muted-foreground">{t('common.loading')}</div> : null}
      {orderQuery.isError ? (
        <div className="rounded-xl border border-[hsl(var(--danger))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {orderQuery.error instanceof Error ? orderQuery.error.message : t('errors.serverDescription')}
        </div>
      ) : null}

      <MasterDetailFilters
        filters={{ keyword, status, channel, owner, dateFrom, dateTo }}
        showMore={showMore}
        setKeyword={setKeyword}
        setStatus={setStatus}
        setChannel={setChannel}
        setOwner={setOwner}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        setPage={setPage}
        onReset={resetFilters}
        onToggleAdvanced={() => setShowMore((value) => !value)}
      />

      <MasterDetailTable
        rows={rows}
        pagedRows={pagedRows}
        selectedIds={selectedIds}
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        deletePending={deleteMutation.isPending}
        onSelectAll={(checked) => setSelectedIds(checked ? pagedRows.map((row) => row.id) : [])}
        onToggleSelection={toggleSelection}
        onChangeSort={changeSort}
        onOpenDetail={openDetail}
        onDeleteRow={(row) => void handleDeleteRow(row)}
        onChangePageSize={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onNextPage={() => setPage((value) => Math.min(pageCount, value + 1))}
      />
    </div>
  );
}
