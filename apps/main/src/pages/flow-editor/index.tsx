import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  toast,
} from '@nop-chaos/ui';
import { getTableRowClassName } from '../../lib/tableRowClassName';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import {
  deleteFlow,
  fetchFlowList,
  saveFlowDetail,
  type FlowDocument,
} from '../../services/mockApi';

const pageSize = 4;

export default function FlowEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const flowQuery = useQuery({ queryKey: ['flows'], queryFn: fetchFlowList });
  const actionMutation = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => {
      void flowQuery.refetch();
    },
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | FlowDocument['status']>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (flowQuery.data ?? []).filter((flow) => {
      const matchesKeyword =
        !keyword ||
        flow.name.toLowerCase().includes(keyword) ||
        flow.description.toLowerCase().includes(keyword);
      const matchesStatus = status === 'all' || flow.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [flowQuery.data, search, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const duplicateFlow = (flow: FlowDocument) => {
    actionMutation.mutate(async () => {
      await saveFlowDetail({
        ...flow,
        id: `flow-${Date.now()}`,
        name: `${flow.name} ${t('common.copy')}`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success(t('flowEditor.duplicateSuccess'));
    });
  };

  const toggleFlowStatus = (flow: FlowDocument) => {
    actionMutation.mutate(async () => {
      await saveFlowDetail({
        ...flow,
        status: flow.status === 'enabled' ? 'disabled' : 'enabled',
      });
      toast.success(t('flowEditor.statusUpdated'));
    });
  };

  const removeFlow = (flowId: string) => {
    if (!window.confirm(t('flowEditor.deleteConfirm'))) {
      return;
    }
    actionMutation.mutate(async () => {
      await deleteFlow(flowId);
      toast.success(t('flowEditor.deleteSuccess'));
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('flowEditor.listEyebrow')}
        title={t('flowEditor.title')}
        description={t('flowEditor.listDescription')}
        actions={
          <Button onClick={() => navigate('/flow-editor/new')}>
            <Plus className="size-4" />
            {t('flowEditor.newFlow')}
          </Button>
        }
      />

      <Card className="theme-card">
        <CardHeader>
          <CardTitle>{t('flowEditor.flowListTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-4 backdrop-blur-xl dark:bg-slate-900/35">
            <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
              <div className="flex min-w-[18rem] flex-1 items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-white/50 px-3 dark:bg-slate-900/35">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  className="border-none bg-transparent shadow-none focus-visible:ring-0"
                  placeholder={t('flowEditor.searchPlaceholder')}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setStatus(value as 'all' | FlowDocument['status']);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[10rem] bg-white/50 dark:bg-slate-900/35">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('flowEditor.allStatuses')}</SelectItem>
                  <SelectItem value="enabled">{t('common.flowStatuses.enabled')}</SelectItem>
                  <SelectItem value="disabled">{t('common.flowStatuses.disabled')}</SelectItem>
                  <SelectItem value="draft">{t('common.flowStatuses.draft')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                    setPage(1);
                  }}
                >
                  {t('common.reset')}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-white/35 backdrop-blur-xl dark:bg-slate-900/30">
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--gray-50))]/90">
                  <TableHead>{t('flowEditor.table.name')}</TableHead>
                  <TableHead>{t('flowEditor.table.description')}</TableHead>
                  <TableHead>{t('flowEditor.table.status')}</TableHead>
                  <TableHead>{t('flowEditor.table.createdAt')}</TableHead>
                  <TableHead>{t('flowEditor.table.updatedAt')}</TableHead>
                  <TableHead className="text-right">{t('flowEditor.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((flow) => (
                  <TableRow key={flow.id} className={getTableRowClassName('interactive')}>
                    <TableCell className="font-medium text-foreground">{flow.name}</TableCell>
                    <TableCell className="max-w-[22rem] whitespace-normal text-muted-foreground">
                      {flow.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          flow.status === 'enabled'
                            ? 'success'
                            : flow.status === 'disabled'
                              ? 'outline'
                              : 'warning'
                        }
                      >
                        {t(`common.flowStatuses.${flow.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(flow.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(flow.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/flow-editor/${flow.id}`)}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateFlow(flow)}
                          disabled={actionMutation.isPending}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFlowStatus(flow)}
                          disabled={actionMutation.isPending}
                        >
                          <Power className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFlow(flow.id)}
                          disabled={actionMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t('flowEditor.paginationSummary', { total: filtered.length, page, pageCount })}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t('common.previousPage')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                {t('common.nextPage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
