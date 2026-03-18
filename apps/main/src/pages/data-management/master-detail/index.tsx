import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, Download, Eye, MoreHorizontal, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  Input,
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
  toast
} from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../../components/common/PageHeader'
import { deleteOrders, fetchOrderList, type OrderRecord } from '../../../services/mockApi'
import { useTabStore } from '../../../store/tabStore'

type SortKey = 'orderNo' | 'customerName' | 'status' | 'createdAt' | 'updatedAt' | 'amount'

const statusOptions = ['all', 'active', 'review', 'draft', 'closed'] as const

export default function MasterDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const openTab = useTabStore((state) => state.openTab)
  const orderQuery = useQuery({ queryKey: ['orders'], queryFn: fetchOrderList })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('all')
  const [channel, setChannel] = useState('')
  const [owner, setOwner] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const filtered = (orderQuery.data ?? []).filter((row) => {
      const matchesKeyword = !keyword || [row.orderNo, row.customerName, row.owner].some((value) => value.toLowerCase().includes(keyword.toLowerCase()))
      const matchesStatus = status === 'all' || row.status === status
      const matchesChannel = !channel || row.channel.includes(channel)
      const matchesOwner = !owner || row.owner.toLowerCase().includes(owner.toLowerCase())
      const matchesFrom = !dateFrom || new Date(row.createdAt) >= new Date(dateFrom)
      const matchesTo = !dateTo || new Date(row.createdAt) <= new Date(dateTo)
      return matchesKeyword && matchesStatus && matchesChannel && matchesOwner && matchesFrom && matchesTo
    })

    filtered.sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1
      const aValue = a[sortKey]
      const bValue = b[sortKey]
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction
      }
      return String(aValue).localeCompare(String(bValue)) * direction
    })

    return filtered
  }, [channel, dateFrom, dateTo, keyword, orderQuery.data, owner, sortKey, sortOrder, status])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelection = (id: string) => {
    setSelectedIds((state) => (state.includes(id) ? state.filter((item) => item !== id) : [...state, id]))
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      return
    }
    if (!window.confirm(t('masterDetail.batchDeleteConfirm', { count: selectedIds.length }))) {
      return
    }
    await deleteOrders(selectedIds)
    setSelectedIds([])
    await orderQuery.refetch()
    toast.success(t('masterDetail.batchDeleteSuccess'))
  }

  const handleExport = () => {
    if (selectedIds.length === 0) {
      toast.info(t('masterDetail.exportSelectHint'))
      return
    }
    if (!window.confirm(t('masterDetail.exportConfirm', { count: selectedIds.length }))) {
      return
    }
    const data = rows.filter((row) => selectedIds.includes(row.id))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'orders-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const changeSort = (key: SortKey) => {
    setSortKey(key)
    setSortOrder((current) => (sortKey === key ? (current === 'asc' ? 'desc' : 'asc') : 'desc'))
  }

  const handleDeleteRow = async (row: OrderRecord) => {
    if (!window.confirm(t('masterDetail.rowDeleteConfirm', { orderNo: row.orderNo }))) {
      return
    }

    await deleteOrders([row.id])
    await orderQuery.refetch()
    toast.success(t('masterDetail.rowDeleteSuccess'))
  }

  const resetFilters = () => {
    setKeyword('')
    setStatus('all')
    setChannel('')
    setOwner('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const openDetail = (row: OrderRecord) => {
    openTab({
      path: `/data-management/master-detail/${row.id}`,
      title: `${row.orderNo} · ${row.customerName}`,
      icon: 'table',
      closable: true
    })
    navigate(`/data-management/master-detail/${row.id}`)
  }

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
            <Button variant="destructive" onClick={() => void handleBatchDelete()}>
              <Trash2 className="size-4" />
              {t('masterDetail.batchDelete')}
            </Button>
          </div>
        }
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white/55 px-3 dark:bg-slate-900/35">
            <Search className="size-4 text-muted-foreground" />
            <Input
              className="h-9 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder={t('masterDetail.searchPlaceholder')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setPage(1)
                }
              }}
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as (typeof statusOptions)[number])}>
            <SelectTrigger className="h-9 w-[9rem] bg-white/55 dark:bg-slate-900/35">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('masterDetail.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('common.orderStatuses.active')}</SelectItem>
              <SelectItem value="review">{t('common.orderStatuses.review')}</SelectItem>
              <SelectItem value="draft">{t('common.orderStatuses.draft')}</SelectItem>
              <SelectItem value="closed">{t('common.orderStatuses.closed')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex min-w-[17rem] items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white/45 px-3 py-1.5 dark:bg-slate-900/25">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-8 border-none bg-transparent px-0 shadow-none focus-visible:ring-0" />
            <span className="text-sm text-muted-foreground">{t('masterDetail.to')}</span>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-8 border-none bg-transparent px-0 shadow-none focus-visible:ring-0" />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setPage(1)}>{t('masterDetail.query')}</Button>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              {t('common.reset')}
            </Button>
            <Button size="sm" variant={showMore ? 'secondary' : 'ghost'} onClick={() => setShowMore((value) => !value)}>
              {showMore ? t('masterDetail.collapse') : t('masterDetail.advanced')}
            </Button>
          </div>
        </div>
        {showMore ? (
          <div className="grid gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] bg-white/25 p-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.1fr] dark:bg-slate-900/20">
            <Input placeholder={t('masterDetail.channelPlaceholder')} value={channel} onChange={(event) => setChannel(event.target.value)} className="bg-white/55 dark:bg-slate-900/35" />
            <Input placeholder={t('masterDetail.ownerPlaceholder')} value={owner} onChange={(event) => setOwner(event.target.value)} className="bg-white/55 dark:bg-slate-900/35" />
            <div className="flex items-center rounded-xl bg-white/40 px-3 py-2 text-sm text-muted-foreground dark:bg-slate-900/25">
              {t('masterDetail.advancedHint')}
            </div>
          </div>
        ) : null}
      </div>

      <Card className="theme-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">{t('masterDetail.tableTitle')}</CardTitle>
          <div className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-sm text-muted-foreground">{t('masterDetail.selectedCount', { count: selectedIds.length })}</div>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-0">
          <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white/25 dark:bg-slate-900/20">
            <Table className="text-[13px]">
              <TableHeader className="sticky top-0 z-10 bg-[hsl(var(--gray-50))]/95 backdrop-blur">
                <TableRow className="bg-[hsl(var(--gray-50))]/90">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id))}
                      onCheckedChange={(checked) => setSelectedIds(checked ? pagedRows.map((row) => row.id) : [])}
                    />
                  </TableHead>
                  {[
                    ['orderNo', t('masterDetail.columns.orderNo')],
                    ['customerName', t('masterDetail.columns.customerName')],
                    ['status', t('masterDetail.columns.status')],
                    ['createdAt', t('masterDetail.columns.createdAt')],
                    ['updatedAt', t('masterDetail.columns.updatedAt')],
                    ['amount', t('masterDetail.columns.amount')]
                  ].map(([key, label]) => (
                    <TableHead key={key} className="h-9">
                      <button className="inline-flex items-center gap-1 text-sm font-medium" onClick={() => changeSort(key as SortKey)} type="button">
                        {label}
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
                    <TableRow key={row.id} className={getTableRowClassName('interactive')} onClick={() => openDetail(row)}>
                      <TableCell className="py-2" onClick={(event) => event.stopPropagation()}>
                        <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleSelection(row.id)} />
                      </TableCell>
                      <TableCell className="py-2 font-medium text-foreground">{row.orderNo}</TableCell>
                      <TableCell className="py-2">{row.customerName}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={row.status === 'active' ? 'success' : row.status === 'review' ? 'warning' : row.status === 'closed' ? 'outline' : 'secondary'}>{t(`common.orderStatuses.${row.status}`)}</Badge>
                      </TableCell>
                      <TableCell className="py-2">{row.createdAt}</TableCell>
                      <TableCell className="py-2">{row.updatedAt}</TableCell>
                      <TableCell className="py-2">￥{row.amount.toLocaleString()}</TableCell>
                      <TableCell className="py-2">{row.owner}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => openDetail(row)}>
                            <Eye className="size-4" />
                            {t('masterDetail.view')}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon-sm" variant="outline" className="h-8 w-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => openDetail(row)}>{t('common.edit')}</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void handleDeleteRow(row)}>{t('common.delete')}</DropdownMenuItem>
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
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1) }}>
                <SelectTrigger className="h-8 w-[6.5rem] bg-white/55 dark:bg-slate-900/35">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{t('masterDetail.perPage', { count: 5 })}</SelectItem>
                  <SelectItem value="10">{t('masterDetail.perPage', { count: 10 })}</SelectItem>
                  <SelectItem value="20">{t('masterDetail.perPage', { count: 20 })}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                {t('common.previousPage')}
              </Button>
              <span>
                {page} / {pageCount}
              </span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                {t('common.nextPage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
