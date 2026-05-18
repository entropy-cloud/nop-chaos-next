import type { MouseEvent as ReactMouseEvent } from 'react';
import { ArrowDownUp, Eye, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getTableRowClassName,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { OrderRecord } from '../../../../services/mockApi';
import type { SortKey } from '../listTypes';

interface MasterDetailTableProps {
  rows: OrderRecord[];
  pagedRows: OrderRecord[];
  selectedIds: string[];
  page: number;
  pageCount: number;
  pageSize: number;
  deletePending: boolean;
  onSelectAll: (checked: boolean) => void;
  onToggleSelection: (id: string) => void;
  onChangeSort: (key: SortKey) => void;
  onOpenDetail: (row: OrderRecord) => void;
  onDeleteRow: (row: OrderRecord) => void;
  onChangePageSize: (value: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const sortableColumns: ReadonlyArray<readonly [SortKey, string]> = [
  ['orderNo', 'masterDetail.columns.orderNo'],
  ['customerName', 'masterDetail.columns.customerName'],
  ['status', 'masterDetail.columns.status'],
  ['createdAt', 'masterDetail.columns.createdAt'],
  ['updatedAt', 'masterDetail.columns.updatedAt'],
  ['amount', 'masterDetail.columns.amount'],
];

function getBadgeVariant(status: OrderRecord['status']) {
  if (status === 'active') {
    return 'success';
  }

  if (status === 'review') {
    return 'warning';
  }

  if (status === 'closed') {
    return 'outline';
  }

  return 'secondary';
}

export function MasterDetailTable({
  rows,
  pagedRows,
  selectedIds,
  page,
  pageCount,
  pageSize,
  deletePending,
  onSelectAll,
  onToggleSelection,
  onChangeSort,
  onOpenDetail,
  onDeleteRow,
  onChangePageSize,
  onPreviousPage,
  onNextPage,
}: MasterDetailTableProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-base">{t('masterDetail.tableTitle')}</CardTitle>
        <div className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-sm text-muted-foreground">
          {t('masterDetail.selectedCount', { count: selectedIds.length })}
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-surface-ghost">
          <Table className="text-[13px]">
            <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--gray-50))]/95 backdrop-blur">
              <TableRow className="bg-[hsl(var(--gray-50))]/90">
                <TableHead className="w-10">
                  <Checkbox
                    checked={pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id))}
                    onCheckedChange={(checked: boolean) => onSelectAll(checked)}
                  />
                </TableHead>
                {sortableColumns.map(([key, labelKey]) => (
                  <TableHead key={key} className="h-9">
                    <button
                      className="inline-flex items-center gap-1 text-sm font-medium"
                      onClick={() => onChangeSort(key)}
                      type="button"
                    >
                      {t(labelKey)}
                      <ArrowDownUp className="size-4" />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="h-9">{t('masterDetail.columns.owner')}</TableHead>
                <TableHead className="h-9 text-right">{t('masterDetail.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={getTableRowClassName('interactive')}
                  onClick={() => onOpenDetail(row)}
                >
                  <TableCell className="py-2" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={() => onToggleSelection(row.id)}
                    />
                  </TableCell>
                  <TableCell className="py-2 font-medium text-foreground">{row.orderNo}</TableCell>
                  <TableCell className="py-2">{row.customerName}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={getBadgeVariant(row.status)}>
                      {t(`common.orderStatuses.${row.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">{row.createdAt}</TableCell>
                  <TableCell className="py-2">{row.updatedAt}</TableCell>
                  <TableCell className="py-2">￥{row.amount.toLocaleString()}</TableCell>
                  <TableCell className="py-2">{row.owner}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDetail(row);
                        }}
                      >
                        <Eye className="size-4" />
                        {t('masterDetail.view')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={(event) => event.stopPropagation()}
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}
                        >
                          <DropdownMenuItem onSelect={() => onOpenDetail(row)}>
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onDeleteRow(row)} disabled={deletePending}>
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>{t('masterDetail.totalRecords', { count: rows.length })}</div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                if (value) {
                  onChangePageSize(Number(value));
                }
              }}
            >
              <SelectTrigger className="h-8 w-[6.5rem] bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">{t('masterDetail.perPage', { count: 5 })}</SelectItem>
                <SelectItem value="10">{t('masterDetail.perPage', { count: 10 })}</SelectItem>
                <SelectItem value="20">{t('masterDetail.perPage', { count: 20 })}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={onPreviousPage}>
              {t('common.previousPage')}
            </Button>
            <span>
              {page} / {pageCount}
            </span>
            <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={onNextPage}>
              {t('common.nextPage')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
