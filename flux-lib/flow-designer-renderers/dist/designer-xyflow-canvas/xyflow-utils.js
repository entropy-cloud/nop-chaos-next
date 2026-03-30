const VIEWPORT_EPSILON = 0.01;
function toFiniteNumber(value) {
    if (typeof value !== 'number') {
        return undefined;
    }
    return Number.isFinite(value) ? value : undefined;
}
function resolveNodeSize(node, nodeTypeSize) {
    const data = (node.data ?? {});
    const size = (data.size ?? {});
    const width = toFiniteNumber(data.width) ??
        toFiniteNumber(data.nodeWidth) ??
        toFiniteNumber(size.width) ??
        toFiniteNumber(nodeTypeSize?.minWidth) ??
        192;
    const height = toFiniteNumber(data.height) ??
        toFiniteNumber(data.nodeHeight) ??
        toFiniteNumber(size.height) ??
        toFiniteNumber(nodeTypeSize?.minHeight) ??
        110;
    return { width, height };
}
export function createXyflowNodes(snapshot, nodeTypeSizeMap) {
    return snapshot.doc.nodes.map((node) => ({
        ...(() => {
            const resolved = resolveNodeSize(node, nodeTypeSizeMap?.get(node.type));
            return {
                width: resolved.width,
                height: resolved.height,
                measured: { width: resolved.width, height: resolved.height }
            };
        })(),
        id: node.id,
        type: 'designerNode',
        position: { ...node.position },
        selected: snapshot.selection.activeNodeId === node.id,
        data: {
            ...(node.data ?? {}),
            label: String(node.data.label ?? node.id),
            typeLabel: node.type,
            typeId: node.type
        }
    }));
}
export function createXyflowEdges(snapshot) {
    return snapshot.doc.edges.map((edge) => ({
        id: edge.id,
        type: 'designerEdge',
        source: edge.source,
        target: edge.target,
        label: String(edge.data.label ?? edge.id),
        data: {
            ...(edge.data ?? {}),
            label: String(edge.data.label ?? edge.id),
            typeId: edge.type
        },
        selected: snapshot.selection.activeEdgeId === edge.id
    }));
}
export function normalizeControlledViewport(viewport) {
    return {
        x: Math.round(viewport.x),
        y: Math.round(viewport.y),
        zoom: Number(viewport.zoom.toFixed(1))
    };
}
export function viewportsEqual(left, right) {
    return (Math.abs(left.x - right.x) < VIEWPORT_EPSILON &&
        Math.abs(left.y - right.y) < VIEWPORT_EPSILON &&
        Math.abs(left.zoom - right.zoom) < VIEWPORT_EPSILON);
}
export function normalizeViewportChange(value) {
    if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.zoom !== 'number') {
        return null;
    }
    return normalizeControlledViewport({ x: value.x, y: value.y, zoom: value.zoom });
}
export function normalizePositionSignature(position) {
    return `${Math.round(position.x)}:${Math.round(position.y)}`;
}
