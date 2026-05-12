import { Flag, GitBranch, Play, Repeat, SplitSquareVertical, Workflow } from 'lucide-react';
import type { FlowNodeKind } from '../../../services/mock-api';
import type { NodeMeta, PaletteGroup } from './types';

export const nodeMeta: Record<FlowNodeKind, NodeMeta> = {
  start: {
    labelKey: 'flowEditor.editor.nodeTypes.start',
    icon: Play,
    accent: 'from-emerald-400 to-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700',
  },
  end: {
    labelKey: 'flowEditor.editor.nodeTypes.end',
    icon: Flag,
    accent: 'from-rose-400 to-rose-500',
    chip: 'bg-rose-100 text-rose-700',
  },
  task: {
    labelKey: 'flowEditor.editor.nodeTypes.task',
    icon: Workflow,
    accent: 'from-sky-400 to-cyan-500',
    chip: 'bg-sky-100 text-sky-700',
  },
  condition: {
    labelKey: 'flowEditor.editor.nodeTypes.condition',
    icon: GitBranch,
    accent: 'from-amber-400 to-orange-500',
    chip: 'bg-amber-100 text-amber-700',
  },
  parallel: {
    labelKey: 'flowEditor.editor.nodeTypes.parallel',
    icon: SplitSquareVertical,
    accent: 'from-violet-400 to-indigo-500',
    chip: 'bg-violet-100 text-violet-700',
  },
  loop: {
    labelKey: 'flowEditor.editor.nodeTypes.loop',
    icon: Repeat,
    accent: 'from-fuchsia-400 to-pink-500',
    chip: 'bg-fuchsia-100 text-fuchsia-700',
  },
};

export const defaultNodeConfig: Record<FlowNodeKind, Record<string, string>> = {
  start: { trigger: 'manual' },
  end: { result: 'done' },
  task: { executor: 'service', timeout: '30s' },
  condition: { expression: 'payload.ok === true' },
  parallel: { branches: '2' },
  loop: { limit: '3', interval: '1m' },
};

export const paletteGroups: PaletteGroup[] = [
  {
    id: 'basic',
    titleKey: 'flowEditor.editor.paletteGroups.basic.title',
    descriptionKey: 'flowEditor.editor.paletteGroups.basic.description',
    kinds: ['start', 'end'],
  },
  {
    id: 'logic',
    titleKey: 'flowEditor.editor.paletteGroups.logic.title',
    descriptionKey: 'flowEditor.editor.paletteGroups.logic.description',
    kinds: ['condition', 'parallel', 'loop'],
  },
  {
    id: 'execution',
    titleKey: 'flowEditor.editor.paletteGroups.execution.title',
    descriptionKey: 'flowEditor.editor.paletteGroups.execution.description',
    kinds: ['task'],
  },
];

export const MAX_HISTORY_SIZE = 50;
export const SNAP_GRID: [number, number] = [24, 24];
