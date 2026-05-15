import {
  ChevronLeft,
  Download,
  FileJson,
  RotateCcw,
  RotateCw,
  Save,
  Settings2,
} from 'lucide-react';
import { Badge, Button, Switch } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';

interface FlowEditorToolbarProps {
  flowName: string;
  dirty: boolean;
  nodeCount: number;
  edgeCount: number;
  gridEnabled: boolean;
  setGridEnabled: (value: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRestore: () => void;
  onExportJson: () => void;
  onOpenProperties: () => void;
  onSave: () => void;
  onBack: () => void;
}

export function FlowEditorToolbar({
  flowName,
  dirty,
  nodeCount,
  edgeCount,
  gridEnabled,
  setGridEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRestore,
  onExportJson,
  onOpenProperties,
  onSave,
  onBack,
}: FlowEditorToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] px-3 py-2 shadow-sm backdrop-blur-xl">
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <Button aria-label={t('common.backHome')} variant="ghost" size="icon-sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{flowName}</div>
          <div className="meta-text flex flex-wrap items-center gap-2">
            <Badge variant={dirty ? 'warning' : 'success'}>
              {dirty ? t('flowEditor.editor.unsaved') : t('flowEditor.editor.saved')}
            </Badge>
            <span>{t('flowEditor.editor.nodeCount', { count: nodeCount })}</span>
            <span>{t('flowEditor.editor.edgeCount', { count: edgeCount })}</span>
          </div>
        </div>
      </div>
      <div className="meta-text flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3 py-1.5">
        <span>{t('flowEditor.editor.grid')}</span>
        <Switch aria-label={t('flowEditor.editor.grid')} checked={gridEnabled} onCheckedChange={setGridEnabled} />
      </div>
      <Button variant="outline" disabled={!canUndo} onClick={onUndo}>
        <RotateCcw className="size-4" />
        {t('flowEditor.editor.undo')}
      </Button>
      <Button variant="outline" disabled={!canRedo} onClick={onRedo}>
        <RotateCw className="size-4" />
        {t('flowEditor.editor.redo')}
      </Button>
      <Button variant="outline" onClick={onRestore}>
        <Download className="size-4" />
        {t('flowEditor.editor.restore')}
      </Button>
      <Button variant="outline" onClick={onExportJson}>
        <FileJson className="size-4" />
        {t('flowEditor.editor.exportJson')}
      </Button>
      <Button variant="outline" className="xl:hidden" onClick={onOpenProperties}>
        <Settings2 className="size-4" />
        {t('flowEditor.editor.properties')}
      </Button>
      <Button onClick={onSave}>
        <Save className="size-4" />
        {t('flowEditor.editor.save')}
      </Button>
    </div>
  );
}
