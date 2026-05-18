import { useMemo } from 'react';
import {
  ReactFlowProvider,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { cn } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { confirmInApp } from '../../../services/confirm';
import { nodeMeta } from './constants';
import { FlowEditorActionsContext } from './context';
import { FlowCanvas } from './components/FlowCanvas';
import { FlowDeleteDialog } from './components/FlowDeleteDialog';
import { FlowEditorToolbar } from './components/FlowEditorToolbar';
import { FlowEdgeRenderer } from './components/FlowEdgeRenderer';
import { FlowInspectorPanel } from './components/FlowInspectorPanel';
import { FlowMobilePanels } from './components/FlowMobilePanels';
import { FlowNodePalette } from './components/FlowNodePalette';
import { FlowNodeCard } from './components/FlowNodeCard';
import type { FlowSelectionSummary } from './types';
import { useFlowEditorState } from './useFlowEditorState';
import { useFlowEditorActions } from './useFlowEditorActions';
import { useFlowPersistence } from './useFlowPersistence';
import { useFlowDragDrop } from './useFlowDragDrop';
import { useFlowKeyboardShortcuts } from './useFlowKeyboardShortcuts';

function FlowEditorPageInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = useFlowEditorState();
  const actions = useFlowEditorActions({ state });
  const persistence = useFlowPersistence({ state });
  const dragDrop = useFlowDragDrop({ addNode: actions.addNode });

  useFlowKeyboardShortcuts({
    t,
    selectedNode: state.selectedNode,
    clipboardNode: state.clipboardNode,
    nodes: state.nodes,
    edges: state.edges,
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
    setClipboardNode: state.setClipboardNode,
    applyState: state.applyState,
    setSelectedNodeId: state.setSelectedNodeId,
    handleUndo: actions.handleUndo,
    handleRedo: actions.handleRedo,
    requestDelete: actions.requestDelete,
  });

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      start: FlowNodeCard,
      end: FlowNodeCard,
      task: FlowNodeCard,
      condition: FlowNodeCard,
      parallel: FlowNodeCard,
      loop: FlowNodeCard,
    }),
    [],
  );

  const edgeTypes = useMemo<EdgeTypes>(() => ({ flowEdge: FlowEdgeRenderer }), []);

  const activeSummary: FlowSelectionSummary | null = state.selectedNode
    ? {
        title: t(state.selectedNode.data.label),
        description: t(state.selectedNode.data.description),
        type: t(nodeMeta[state.selectedNode.data.kind].labelKey),
      }
    : state.selectedEdge
      ? {
          title: t(state.selectedEdge.data?.condition ?? 'flowEditor.editor.edge'),
          description: t(
            state.selectedEdge.label?.toString() ?? 'flowEditor.editor.pathConfig',
          ),
          type: t('flowEditor.editor.edge'),
        }
      : null;
  const inspectorHandleLabel = activeSummary?.type ?? t('flowEditor.editor.properties');

  const navigateBackWithGuard = async () => {
    if (state.dirty && !(await confirmInApp(t('flowEditor.editor.leaveConfirm')))) {
      return;
    }

    navigate('/flow-editor');
  };

  return (
    <FlowEditorActionsContext.Provider value={actions.editorActions}>
      <div className="flex h-[calc(100vh-10rem)] min-h-[40rem] flex-col gap-3">
        <FlowEditorToolbar
          flowName={state.flowDocument?.name ?? t('flowEditor.editTitle')}
          dirty={state.dirty}
          nodeCount={state.nodes.length}
          edgeCount={state.edges.length}
          gridEnabled={state.gridEnabled}
          setGridEnabled={state.setGridEnabled}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          onUndo={actions.handleUndo}
          onRedo={actions.handleRedo}
          onRestore={persistence.restoreSaved}
          onExportJson={persistence.exportJson}
          onOpenProperties={() => {
            if (state.selectedEdge) {
              state.setEdgePanelOpen(true);
              return;
            }
            state.setPropertyOpen(true);
          }}
          onSave={() => void persistence.saveSnapshot()}
          onBack={navigateBackWithGuard}
        />

        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              'grid min-h-0 h-full gap-3',
              state.inspectorCollapsed
                ? 'xl:grid-cols-[15rem_minmax(0,1fr)]'
                : 'xl:grid-cols-[15rem_minmax(0,1fr)_22rem]',
            )}
          >
            <FlowNodePalette
              onPaletteDragStart={dragDrop.onPaletteDragStart}
              onAddNode={actions.addNode}
            />

            <FlowCanvas
              nodes={state.nodes}
              edges={state.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              gridEnabled={state.gridEnabled}
              onConnect={actions.onConnect}
              onNodesChange={actions.onNodesChange}
              onEdgesChange={actions.onEdgesChange}
              onPaneClick={() => {
                state.setSelectedNodeId(null);
                state.setSelectedEdgeId(null);
              }}
              onNodeClick={(nodeId) => {
                state.setSelectedNodeId(nodeId);
                state.setSelectedEdgeId(null);
              }}
              onNodeDoubleClick={actions.openNodeEditor}
              onEdgeClick={(edgeId) => {
                state.setSelectedEdgeId(edgeId);
                state.setSelectedNodeId(null);
              }}
              onEdgeDoubleClick={actions.openEdgeEditor}
              onCanvasDragOver={dragDrop.onCanvasDragOver}
              onCanvasDrop={dragDrop.onCanvasDrop}
            />

            <FlowInspectorPanel
              inspectorCollapsed={state.inspectorCollapsed}
              inspectorHandleLabel={inspectorHandleLabel}
              flowDocument={state.flowDocument}
              nodeCount={state.nodes.length}
              edgeCount={state.edges.length}
              activeSummary={activeSummary}
              selectedNode={state.selectedNode}
              selectedEdge={state.selectedEdge}
              nodes={state.nodes}
              updateNodeData={actions.updateNodeData}
              updateEdgeData={actions.updateEdgeData}
              onToggleCollapsed={() => state.setInspectorCollapsed((value) => !value)}
            />
          </div>
        </div>

        <FlowMobilePanels
          propertyOpen={state.propertyOpen}
          setPropertyOpen={state.setPropertyOpen}
          edgePanelOpen={state.edgePanelOpen}
          setEdgePanelOpen={state.setEdgePanelOpen}
          selectedNode={state.selectedNode}
          selectedEdge={state.selectedEdge}
          nodes={state.nodes}
          updateNodeData={actions.updateNodeData}
          updateEdgeData={actions.updateEdgeData}
        />

        <FlowDeleteDialog
          open={state.deleteDialogOpen}
          onOpenChange={(open) => {
            state.setDeleteDialogOpen(open);
            if (!open) {
              state.setDeleteTarget(null);
            }
          }}
          onConfirm={actions.confirmDelete}
        />
      </div>
    </FlowEditorActionsContext.Provider>
  );
}

export default function FlowEditorEditPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorPageInner />
    </ReactFlowProvider>
  );
}
