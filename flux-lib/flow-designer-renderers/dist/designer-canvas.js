import { useCallback, useMemo, useState } from 'react';
import { renderDesignerCanvasBridge } from './canvas-bridge';
import { useDesignerContext } from './designer-context';
export function DesignerCanvasContent() {
    const { dispatch, snapshot, config } = useDesignerContext();
    const nodeTypeSizeMap = useMemo(() => {
        const map = new Map();
        for (const nodeType of config.nodeTypes) {
            map.set(nodeType.id, {
                minWidth: nodeType.appearance?.minWidth,
                minHeight: nodeType.appearance?.minHeight
            });
        }
        return map;
    }, [config.nodeTypes]);
    const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState(null);
    const [reconnectingEdgeId, setReconnectingEdgeId] = useState(null);
    const handlePaneClick = useCallback(() => {
        setPendingConnectionSourceId(null);
        setReconnectingEdgeId(null);
        dispatch({ type: 'clearSelection' });
    }, [dispatch]);
    const handleNodeClick = useCallback((nodeId, e) => {
        e?.stopPropagation();
        dispatch({ type: 'selectNode', nodeId });
    }, [dispatch]);
    const handleEdgeClick = useCallback((edgeId, e) => {
        e?.stopPropagation();
        dispatch({ type: 'selectEdge', edgeId });
    }, [dispatch]);
    const handleDeleteNode = useCallback((nodeId) => {
        dispatch({ type: 'deleteNode', nodeId });
    }, [dispatch]);
    const handleDuplicateNode = useCallback((nodeId) => {
        dispatch({ type: 'duplicateNode', nodeId });
    }, [dispatch]);
    const handleDeleteEdge = useCallback((edgeId) => {
        dispatch({ type: 'deleteEdge', edgeId });
    }, [dispatch]);
    return renderDesignerCanvasBridge('xyflow', {
        snapshot,
        canvasConfig: config.canvas,
        nodeTypeSizeMap,
        pendingConnectionSourceId,
        reconnectingEdgeId,
        onPaneClick: handlePaneClick,
        onNodeSelect: handleNodeClick,
        onEdgeSelect: handleEdgeClick,
        onStartConnection: (nodeId, event) => {
            event?.stopPropagation();
            setReconnectingEdgeId(null);
            setPendingConnectionSourceId(nodeId);
        },
        onCancelConnection: (nodeId, event) => {
            event?.stopPropagation();
            if (pendingConnectionSourceId === nodeId) {
                setPendingConnectionSourceId(null);
            }
        },
        onCompleteConnection: (nodeId, event) => {
            event?.stopPropagation();
            if (!pendingConnectionSourceId || pendingConnectionSourceId === nodeId) {
                return;
            }
            const result = dispatch({ type: 'addEdge', source: pendingConnectionSourceId, target: nodeId });
            if (result.ok) {
                setPendingConnectionSourceId(null);
            }
        },
        onStartReconnect: (edgeId, event) => {
            event?.stopPropagation();
            setPendingConnectionSourceId(null);
            setReconnectingEdgeId(edgeId);
        },
        onCancelReconnect: (edgeId, event) => {
            event?.stopPropagation();
            if (reconnectingEdgeId === edgeId) {
                setReconnectingEdgeId(null);
            }
        },
        onCompleteReconnect: (edgeId, sourceId, nodeId, event) => {
            event?.stopPropagation();
            const edge = snapshot.doc.edges.find((item) => item.id === edgeId);
            if (!edge || edge.target === nodeId) {
                return;
            }
            const result = dispatch({ type: 'reconnectEdge', edgeId, source: sourceId, target: nodeId });
            if (result.ok) {
                setReconnectingEdgeId(null);
            }
        },
        onDuplicateNode: (nodeId, event) => {
            event?.stopPropagation();
            handleDuplicateNode(nodeId);
        },
        onDeleteNode: (nodeId, event) => {
            event?.stopPropagation();
            handleDeleteNode(nodeId);
        },
        onDeleteEdge: (edgeId, event) => {
            event?.stopPropagation();
            handleDeleteEdge(edgeId);
        },
        onMoveNode: (nodeId, event, position) => {
            event?.stopPropagation();
            const node = snapshot.doc.nodes.find((item) => item.id === nodeId);
            if (!node) {
                return;
            }
            dispatch({
                type: 'moveNode',
                nodeId,
                position: position ?? { x: node.position.x + 24, y: node.position.y + 24 }
            });
        },
        onViewportChange: (viewport, event) => {
            event?.stopPropagation();
            dispatch({ type: 'setViewport', viewport });
        },
        onDrop: (nodeTypeId, position) => {
            dispatch({ type: 'addNode', nodeType: nodeTypeId, position });
        }
    });
}
