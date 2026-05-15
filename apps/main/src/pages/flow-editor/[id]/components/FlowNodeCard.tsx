import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { Button } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { nodeMeta } from '../constants';
import { useFlowEditorActions } from '../context';
import { useFloatingToolbarVisibility } from '../useFloatingToolbarVisibility';
import type { FlowNode } from '../types';

export function FlowNodeCard({ id, data, selected }: NodeProps<FlowNode>) {
  const { t } = useTranslation();
  const actions = useFlowEditorActions();
  const meta = nodeMeta[data.kind];
  const Icon = meta.icon;
  const { showToolbar, show, hide } = useFloatingToolbarVisibility(
    id,
    selected,
    actions.hoveredNodeId,
    actions.setHoveredNode,
  );
  const allowTarget = data.kind !== 'start';
  const allowSource = data.kind !== 'end';

  const stopToolbarEvent = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      actions.selectNode(id);
    }
  };

  return (
    <div
      data-testid={`flow-node-${id}`}
      role="button"
      tabIndex={0}
      onFocus={show}
      onBlur={hide}
      className={`relative min-w-[12rem] rounded-xl border bg-[var(--card-surface)] p-3 shadow-lg backdrop-blur-xl transition ${selected ? 'border-[hsl(var(--primary))] ring-2 ring-[color-mix(in_hsl,hsl(var(--primary))_24%,transparent)]' : 'border-white/40'}`}
      onClick={(event) => {
        event.stopPropagation();
        actions.selectNode(id);
      }}
      onKeyDown={handleCardKeyDown}
      onDoubleClick={(event) => {
        event.stopPropagation();
        actions.openNodeEditor(id);
      }}
      onPointerEnter={show}
      onPointerLeave={hide}
    >
      {allowTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-[hsl(var(--primary))]"
        />
      ) : null}
      {allowSource ? (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-[hsl(var(--primary))]"
        />
      ) : null}
      <NodeToolbar isVisible={showToolbar} position={Position.Top} offset={10}>
        <div
          data-testid={`node-toolbar-${id}`}
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] p-1 shadow-md backdrop-blur-xl"
          onPointerEnter={show}
          onPointerLeave={hide}
        >
          <Button
            aria-label={t('common.edit')}
            size="icon-sm"
            variant="ghost"
            onMouseDown={stopToolbarEvent}
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              stopToolbarEvent(event);
              actions.openNodeEditor(id);
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={t('common.copy')}
            size="icon-sm"
            variant="ghost"
            onMouseDown={stopToolbarEvent}
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              stopToolbarEvent(event);
              actions.duplicateNode(id);
            }}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            aria-label={t('common.delete')}
            size="icon-sm"
            variant="ghost"
            onMouseDown={stopToolbarEvent}
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              stopToolbarEvent(event);
              actions.requestDelete({ type: 'node', id });
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </NodeToolbar>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent} text-white shadow-sm`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{t(data.label)}</div>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {t(data.description)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className={`rounded-full px-2 py-1 font-medium ${meta.chip}`}>
          {t(meta.labelKey)}
        </span>
        <span>
          {t('flowEditor.editor.configCount', { count: Object.keys(data.config).length })}
        </span>
      </div>
    </div>
  );
}
