import type { NopDebugEvent, NopDebuggerSnapshot, NopDebuggerTab } from './types';
export interface NopDebuggerStore {
    getSnapshot(): NopDebuggerSnapshot;
    subscribe(listener: () => void): () => void;
    append(event: Omit<NopDebugEvent, 'id' | 'sessionId' | 'timestamp'> & {
        timestamp?: number;
    }): void;
    clear(): void;
    show(): void;
    hide(): void;
    toggle(): void;
    pause(): void;
    resume(): void;
    setActiveTab(tab: NopDebuggerTab): void;
    setPosition(position: {
        x: number;
        y: number;
    }): void;
    toggleFilter(filter: NopDebuggerSnapshot['filters'][number]): void;
}
export declare function createDebuggerStore(input: {
    enabled: boolean;
    sessionId: string;
    maxEvents: number;
    defaultOpen: boolean;
    defaultTab: NopDebuggerTab;
    position: {
        x: number;
        y: number;
    };
    errorBufferKeepEarliest: number;
    errorBufferKeepLatest: number;
}): NopDebuggerStore;
