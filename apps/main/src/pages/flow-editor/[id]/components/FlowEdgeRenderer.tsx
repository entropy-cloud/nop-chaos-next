import type { MouseEvent as ReactMouseEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { Button } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { useFlowEditorActions } from '../context';
import { useFloatingToolbarVisibility } from '../useFloatingToolbarVisibility';
import type { FlowEdge } from '../types';

export function FlowEdgeRenderer(props: EdgeProps<FlowEdge>) {
  const { t } = useTranslation();
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    data,
    selected,
    label,
  } = props;
  const actions = useFlowEditorActions();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const { showToolbar, show, hide } = useFloatingToolbarVisibility(
    id,
    selected ?? false,
    actions.hoveredEdgeId,
    actions.setHoveredEdge,
  );

  const stopToolbarEvent = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const openEditor = (event?: ReactMouseEvent | MouseEvent) => {
    event?.stopPropagation();
    actions.openEdgeEditor(id);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <path
        data-testid={`edge-hitbox-${id}`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          actions.selectEdge(id);
        }}
        onDoubleClick={openEditor}
        onMouseEnter={show}
        onMouseLeave={hide}
      />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <button
              data-testid={`edge-label-${id}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur-xl ${selected ? 'border-[hsl(var(--primary))] bg-[color-mix(in_hsl,hsl(var(--primary))_14%,white)] text-foreground' : 'border-[hsl(var(--border))] bg-[var(--card-surface)] text-muted-foreground'}`}
              onClick={(event) => {
                event.stopPropagation();
                actions.selectEdge(id);
              }}
              onDoubleClick={openEditor}
              onMouseEnter={show}
              onMouseLeave={hide}
              type="button"
            >
              {t(data?.condition ?? label?.toString() ?? 'flowEditor.editor.defaultEdgePath')}
            </button>
            {showToolbar ? (
              <div
                data-testid={`edge-toolbar-${id}`}
                className="pointer-events-auto flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] p-1 shadow-md backdrop-blur-xl"
                onMouseEnter={show}
                onMouseLeave={hide}
              >
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onMouseDown={stopToolbarEvent}
                  onClick={(event) => {
                    stopToolbarEvent(event);
                    actions.openEdgeEditor(id);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onMouseDown={stopToolbarEvent}
                  onClick={(event) => {
                    stopToolbarEvent(event);
                    actions.requestDelete({ type: 'edge', id });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
