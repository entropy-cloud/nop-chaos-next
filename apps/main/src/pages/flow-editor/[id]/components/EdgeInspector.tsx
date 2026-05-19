import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { getEdgeStyle } from '../utils';
import type { FlowEdge, FlowEdgeData } from '../types';

interface EdgeInspectorProps {
  selectedEdge: FlowEdge;
  updateEdgeData: (edgeId: string, updater: (edge: FlowEdge) => FlowEdge) => void;
}

export function EdgeInspector({ selectedEdge, updateEdgeData }: EdgeInspectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5">
        <Label>{t('flowEditor.editor.edgeFields.label')}</Label>
        <Input
          value={selectedEdge.label?.toString() ?? ''}
          onChange={(event) =>
            updateEdgeData(selectedEdge.id, (edge) => ({ ...edge, label: event.target.value }))
          }
        />
      </div>
      <div className="grid gap-2.5">
        <Label>{t('flowEditor.editor.edgeFields.condition')}</Label>
        <Textarea
          value={selectedEdge.data?.condition ?? ''}
          onChange={(event) =>
            updateEdgeData(selectedEdge.id, (edge) => ({
              ...edge,
              data: { condition: event.target.value, lineStyle: edge.data?.lineStyle ?? 'solid' },
            }))
          }
        />
      </div>
      <div className="grid gap-2.5">
        <Label>{t('flowEditor.editor.edgeFields.style')}</Label>
        <Select
          value={selectedEdge.data?.lineStyle ?? 'solid'}
          onValueChange={(value) => {
            if (!value) {
              return;
            }

            updateEdgeData(selectedEdge.id, (edge) => ({
              ...edge,
              data: {
                condition: edge.data?.condition ?? '',
                lineStyle: value as FlowEdgeData['lineStyle'],
              },
              style: getEdgeStyle(value as FlowEdgeData['lineStyle']),
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">{t('flowEditor.editor.edgeStyles.solid')}</SelectItem>
            <SelectItem value="dashed">{t('flowEditor.editor.edgeStyles.dashed')}</SelectItem>
            <SelectItem value="dotted">{t('flowEditor.editor.edgeStyles.dotted')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
