import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DesignerXyflowNode } from './DesignerXyflowNode';
import { DesignerXyflowEdge } from './DesignerXyflowEdge';
import { createXyflowNodes, createXyflowEdges, normalizeControlledViewport, viewportsEqual, normalizeViewportChange, normalizePositionSignature } from './xyflow-utils';
export const DESIGNER_PALETTE_NODE_MIME = 'application/x-flow-designer-node-type';
export function DesignerXyflowCanvas(props) {
    const xyflowNodeTypes = useMemo(() => ({
        designerNode: DesignerXyflowNode
    }), []);
    const xyflowEdgeTypes = useMemo(() => ({
        designerEdge: DesignerXyflowEdge
    }), []);
    const snapshotNodes = useMemo(() => createXyflowNodes(props.snapshot, props.nodeTypeSizeMap), [props.snapshot, props.nodeTypeSizeMap]);
    const snapshotEdges = useMemo(() => createXyflowEdges(props.snapshot), [props.snapshot]);
    const viewport = useMemo(() => normalizeControlledViewport(props.snapshot.doc.viewport ?? props.snapshot.viewport), [props.snapshot.doc.viewport, props.snapshot.viewport]);
    const [controlledViewport, setControlledViewport] = useState(viewport);
    const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const lastCommittedPositionsRef = useRef(new Map());
    const hoverTimeoutRef = useRef(null);
    const [localNodes, setLocalNodes, onNodesChangeInternal] = useNodesState(snapshotNodes);
    const [localEdges, setLocalEdges, onEdgesChangeInternal] = useEdgesState(snapshotEdges);
    const showMinimap = props.showMinimap !== false;
    const showControls = props.showControls !== false;
    const surfaceRef = useRef(null);
    const gridSize = props.canvasConfig?.gridSize ?? 24;
    const backgroundType = props.canvasConfig?.background ?? 'lines';
    const backgroundVariant = backgroundType === 'dots'
        ? BackgroundVariant.Dots
        : backgroundType === 'cross'
            ? BackgroundVariant.Cross
            : BackgroundVariant.Lines;
    const showBackground = props.snapshot.gridEnabled && backgroundType !== 'none';
    useEffect(() => {
        if (!showMinimap)
            return;
        const minimapSvg = surfaceRef.current?.querySelector('.react-flow__minimap svg');
        if (minimapSvg && minimapSvg.getAttribute('preserveAspectRatio') !== 'none') {
            minimapSvg.setAttribute('preserveAspectRatio', 'none');
        }
    }, [showMinimap, localNodes, localEdges]);
    useEffect(() => {
        setControlledViewport((current) => (viewportsEqual(current, viewport) ? current : viewport));
    }, [viewport]);
    useEffect(() => {
        const snapshotPositionMap = new Map(snapshotNodes.map((node) => [node.id, normalizePositionSignature(node.position)]));
        setLocalNodes((currentNodes) => {
            if (currentNodes.length === 0) {
                return snapshotNodes;
            }
            const lastCommitted = lastCommittedPositionsRef.current;
            const mergedNodes = snapshotNodes.map((snapshotNode) => {
                const localNode = currentNodes.find((n) => n.id === snapshotNode.id);
                if (!localNode) {
                    return snapshotNode;
                }
                const snapshotSignature = snapshotPositionMap.get(snapshotNode.id);
                const committedSignature = lastCommitted.get(snapshotNode.id);
                if (committedSignature && snapshotSignature === committedSignature) {
                    return localNode;
                }
                return snapshotNode;
            });
            return mergedNodes;
        });
    }, [snapshotNodes, setLocalNodes]);
    useEffect(() => {
        setLocalEdges(snapshotEdges);
    }, [snapshotEdges, setLocalEdges]);
    const renderedEdges = useMemo(() => (localEdges.map((edge) => ({
        ...edge,
        data: {
            ...(edge.data ?? {}),
            __fdHovered: edge.id === hoveredEdgeId
        }
    }))), [localEdges, hoveredEdgeId]);
    const handleNodesChange = useCallback((changes) => {
        onNodesChangeInternal(changes);
        for (const change of changes) {
            if (change.type === 'remove') {
                props.onDeleteNode(change.id, undefined);
                lastCommittedPositionsRef.current.delete(change.id);
                continue;
            }
            if (change.type === 'position' && change.dragging === false && change.position) {
                const position = {
                    x: Math.round(change.position.x),
                    y: Math.round(change.position.y)
                };
                const signature = normalizePositionSignature(position);
                lastCommittedPositionsRef.current.set(change.id, signature);
                props.onMoveNode(change.id, undefined, position);
            }
        }
    }, [onNodesChangeInternal, props]);
    const handleEdgesChange = useCallback((changes) => {
        onEdgesChangeInternal(changes);
        for (const change of changes) {
            if (change.type === 'remove') {
                props.onDeleteEdge(change.id, undefined);
            }
        }
    }, [onEdgesChangeInternal, props]);
    function handleViewportChange(nextViewport) {
        const normalized = normalizeViewportChange(nextViewport);
        if (!normalized) {
            return;
        }
        setControlledViewport((current) => (viewportsEqual(current, normalized) ? current : normalized));
        if (!viewportsEqual(viewport, normalized)) {
            props.onViewportChange(normalized, undefined);
        }
    }
    function handleConnect(connection) {
        if (!connection.source || !connection.target || connection.source === connection.target) {
            return;
        }
        props.onStartConnection(connection.source, undefined);
        props.onCompleteConnection(connection.target, undefined);
    }
    const handleReconnect = useCallback((oldEdge, newConnection) => {
        if (!oldEdge.id || !newConnection.source || !newConnection.target || newConnection.source === newConnection.target) {
            return;
        }
        props.onStartReconnect(oldEdge.id, undefined);
        props.onCompleteReconnect(oldEdge.id, newConnection.source, newConnection.target, undefined);
    }, [props]);
    const lastSelectionRef = useRef({
        nodeId: null,
        edgeId: null
    });
    function handleSelectionChange(selection) {
        if (selection.nodes.length > 0) {
            const nodeId = selection.nodes[0].id;
            if (lastSelectionRef.current.nodeId !== nodeId) {
                lastSelectionRef.current = { nodeId, edgeId: null };
                props.onNodeSelect(nodeId, undefined);
            }
            return;
        }
        if (selection.edges.length > 0) {
            const edgeId = selection.edges[0].id;
            if (lastSelectionRef.current.edgeId !== edgeId) {
                lastSelectionRef.current = { nodeId: null, edgeId };
                props.onEdgeSelect(edgeId, undefined);
            }
            return;
        }
        if (lastSelectionRef.current.nodeId || lastSelectionRef.current.edgeId) {
            lastSelectionRef.current = { nodeId: null, edgeId: null };
            props.onPaneClick();
        }
    }
    return (_jsx(ReactFlowProvider, { children: _jsx("div", { className: "absolute inset-0 fd-xyflow-surface rounded-xl overflow-hidden", style: {
                background: 'radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 28%), radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.1), transparent 30%), rgba(255,255,255,0.78)'
            }, ref: surfaceRef, children: _jsxs(ReactFlow, { nodes: localNodes, edges: renderedEdges, nodeTypes: xyflowNodeTypes, edgeTypes: xyflowEdgeTypes, onInit: (instance) => setReactFlowInstance(instance), defaultViewport: controlledViewport, fitView: true, nodesConnectable: true, elementsSelectable: true, nodesDraggable: true, onMove: (_event, nextViewport) => handleViewportChange(nextViewport), onMoveEnd: (_event, nextViewport) => handleViewportChange(nextViewport), onPaneClick: () => {
                    props.onPaneClick();
                }, onConnect: handleConnect, onReconnect: handleReconnect, onNodesChange: handleNodesChange, onEdgesChange: handleEdgesChange, onSelectionChange: handleSelectionChange, onNodeClick: (_event, node) => props.onNodeSelect(node.id, undefined), onEdgeClick: (_event, edge) => props.onEdgeSelect(edge.id, undefined), proOptions: { hideAttribution: true }, onNodeMouseEnter: (_e, node) => {
                    if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                    }
                    props.onNodeHover?.(node.id, undefined);
                }, onNodeMouseLeave: () => {
                    hoverTimeoutRef.current = setTimeout(() => {
                        props.onNodeHover?.(null, undefined);
                    }, 160);
                }, onEdgeMouseEnter: (_e, edge) => {
                    if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                    }
                    setHoveredEdgeId(edge.id);
                    props.onEdgeHover?.(edge.id, undefined);
                }, onEdgeMouseLeave: () => {
                    hoverTimeoutRef.current = setTimeout(() => {
                        setHoveredEdgeId(null);
                        props.onEdgeHover?.(null, undefined);
                    }, 160);
                }, onNodeDoubleClick: (_event, node) => {
                    props.onNodeDoubleClick?.(node.id, undefined);
                }, onEdgeDoubleClick: (_event, edge) => {
                    props.onEdgeDoubleClick?.(edge.id, undefined);
                }, onDrop: (event) => {
                    event.preventDefault();
                    const nodeTypeId = event.dataTransfer.getData(DESIGNER_PALETTE_NODE_MIME);
                    if (!nodeTypeId || !props.onDrop)
                        return;
                    const position = reactFlowInstance
                        ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
                        : { x: event.clientX, y: event.clientY };
                    props.onDrop(nodeTypeId, position);
                }, onDragOver: (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                }, children: [showBackground && (_jsx(Background, { gap: gridSize, size: 1, variant: backgroundVariant, color: "rgba(148, 163, 184, 0.26)" })), showMinimap && (_jsx(MiniMap, { className: "fd-xyflow-minimap !rounded-2xl !border !border-border", pannable: true, zoomable: true, bgColor: "rgba(219, 234, 254, 0.5)", offsetScale: 0, nodeColor: () => 'rgba(15, 23, 42, 0.92)', nodeStrokeColor: () => 'hsl(221.2, 83.2%, 53.3%)', nodeBorderRadius: 4, maskColor: "rgba(255, 255, 255, 0.55)" })), showControls && _jsx(Controls, { className: "fd-xyflow-controls", showInteractive: false })] }) }) }));
}
