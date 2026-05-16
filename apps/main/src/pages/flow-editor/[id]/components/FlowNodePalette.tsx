import type { DragEvent as ReactDragEvent } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, CardContent, ScrollArea } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { FlowNodeKind } from '../../../../services/mockApi';
import { nodeMeta, paletteGroups } from '../constants';

interface FlowNodePaletteProps {
  onPaletteDragStart: (event: ReactDragEvent<HTMLButtonElement>, kind: FlowNodeKind) => void;
  onAddNode: (kind: FlowNodeKind) => void;
}

export function FlowNodePalette({ onPaletteDragStart, onAddNode }: FlowNodePaletteProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card min-h-0 overflow-hidden shadow-sm">
      <CardContent className="flex h-full min-h-0 flex-col p-0">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {t('flowEditor.editor.nodeLibrary')}
            </div>
            <div className="meta-text">{t('flowEditor.editor.nodeLibraryHint')}</div>
          </div>
          <Badge variant="outline">
            {paletteGroups.reduce((count, group) => count + group.kinds.length, 0)}
          </Badge>
        </div>
        <ScrollArea className="min-h-0 flex-1 px-3 py-3">
          <div className="space-y-3">
            {paletteGroups.map((group) => (
              <section
                key={group.id}
                className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-2.5"
              >
                <div className="eyebrow-text mb-2 px-1 text-muted-foreground">
                  {t(group.titleKey)}
                </div>
                <div className="grid gap-2">
                  {group.kinds.map((kind) => {
                    const meta = nodeMeta[kind];
                    const Icon = meta.icon;

                    return (
                      <div
                        key={kind}
                        className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-surface-highlight p-2 shadow-xs"
                      >
                        <button
                          data-testid={`palette-item-${kind}`}
                          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
                          draggable
                          onDragStart={(event) => onPaletteDragStart(event, kind)}
                          type="button"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.accent} text-white`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">
                            {t(meta.labelKey)}
                          </span>
                        </button>
                        <Button size="icon-sm" variant="ghost" onClick={() => onAddNode(kind)}>
                          <Plus aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
