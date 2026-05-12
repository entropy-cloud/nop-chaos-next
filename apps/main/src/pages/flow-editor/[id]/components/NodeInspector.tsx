import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { defaultNodeConfig, nodeMeta } from '../constants';
import type { FlowNode } from '../types';
import type { FlowNodeKind } from '../../../../services/mockApi';

interface NodeInspectorProps {
  selectedNode: FlowNode;
  nodes: FlowNode[];
  updateNodeData: (nodeId: string, updater: (node: FlowNode) => FlowNode) => void;
}

export function NodeInspector({ selectedNode, nodes, updateNodeData }: NodeInspectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('flowEditor.editor.nodeFields.name')}</Label>
        <Input
          value={selectedNode.data.label}
          onChange={(event) =>
            updateNodeData(selectedNode.id, (node) => ({
              ...node,
              data: { ...node.data, label: event.target.value },
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>{t('flowEditor.editor.nodeFields.description')}</Label>
        <Textarea
          value={selectedNode.data.description}
          onChange={(event) =>
            updateNodeData(selectedNode.id, (node) => ({
              ...node,
              data: { ...node.data, description: event.target.value },
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label>{t('flowEditor.editor.nodeFields.type')}</Label>
        <Select
          value={selectedNode.data.kind}
          onValueChange={(value) => {
            if (!value) {
              return;
            }

            if (value === 'start') {
              const startNodes = nodes.filter(
                (node) => node.data.kind === 'start' && node.id !== selectedNode.id,
              );
              if (startNodes.length > 0) {
                toast.error(t('flowEditor.editor.startNodeSwitchBlocked'));
                return;
              }
            }

            updateNodeData(selectedNode.id, (node) => ({
              ...node,
              type: value ?? undefined,
              data: {
                ...node.data,
                kind: value as FlowNodeKind,
                config: { ...defaultNodeConfig[value as FlowNodeKind], ...node.data.config },
              },
            }));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(nodeMeta).map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(nodeMeta[kind as FlowNodeKind].labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {Object.entries(selectedNode.data.config).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <Label>{key}</Label>
          <Input
            value={value}
            onChange={(event) =>
              updateNodeData(selectedNode.id, (node) => ({
                ...node,
                data: { ...node.data, config: { ...node.data.config, [key]: event.target.value } },
              }))
            }
          />
        </div>
      ))}
    </div>
  );
}
