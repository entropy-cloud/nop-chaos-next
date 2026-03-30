import type { GraphNode, GraphEdge, NodeTypeConfig } from './types';
export interface ElkLayoutOptions {
    direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
    nodeSpacing?: number;
    layerSpacing?: number;
}
export declare function layoutWithElk(nodes: GraphNode[], edges: GraphEdge[], nodeTypes?: Map<string, NodeTypeConfig>, options?: ElkLayoutOptions): Promise<Map<string, {
    x: number;
    y: number;
}>>;
