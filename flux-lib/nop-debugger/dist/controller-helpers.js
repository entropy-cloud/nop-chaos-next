const DEFAULT_POSITION = { x: 24, y: 24 };
export function readWindowConfig() {
    if (typeof window === 'undefined') {
        return {
            enabled: false,
            defaultOpen: false,
            defaultTab: 'timeline',
            position: DEFAULT_POSITION,
            dock: 'floating'
        };
    }
    const raw = window.__NOP_DEBUGGER__;
    if (raw === true) {
        return {
            enabled: true,
            defaultOpen: true,
            defaultTab: 'timeline',
            position: DEFAULT_POSITION,
            dock: 'floating'
        };
    }
    if (!raw) {
        return {
            enabled: false,
            defaultOpen: false,
            defaultTab: 'timeline',
            position: DEFAULT_POSITION,
            dock: 'floating'
        };
    }
    return {
        enabled: raw.enabled ?? true,
        defaultOpen: raw.defaultOpen ?? true,
        defaultTab: raw.defaultTab ?? 'timeline',
        position: raw.position ?? DEFAULT_POSITION,
        dock: raw.dock ?? 'floating'
    };
}
export function createSessionId(id) {
    return `${id}:${Date.now().toString(36)}`;
}
export function formatErrorDetail(error) {
    if (error instanceof Error) {
        return error.stack ?? error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
export function formatActionResult(result) {
    if (!result) {
        return 'completed';
    }
    if (result.cancelled) {
        return 'cancelled';
    }
    return result.ok ? 'ok' : 'failed';
}
export function summarizeApi(api) {
    return `${String(api.method ?? 'get').toUpperCase()} ${api.url}`;
}
export function summarizeValueShape(value) {
    if (Array.isArray(value)) {
        return {
            responseType: 'array',
            keys: []
        };
    }
    if (value && typeof value === 'object') {
        return {
            responseType: 'object',
            keys: Object.keys(value).slice(0, 12)
        };
    }
    return {
        responseType: value == null ? 'nullish' : typeof value,
        keys: []
    };
}
export function createRequestKey(api, nodeId, path) {
    return `${String(api.method ?? 'get').toUpperCase()} ${api.url} | ${nodeId ?? 'n/a'} | ${path ?? 'n/a'}`;
}
export function buildNetworkSummary(input) {
    const requestShape = summarizeValueShape(input.api.data);
    const responseShape = summarizeValueShape(input.response?.data);
    return {
        method: String(input.api.method ?? 'get').toUpperCase(),
        url: input.api.url,
        status: input.response?.status,
        ok: input.response?.ok,
        aborted: input.aborted,
        requestDataKeys: requestShape.keys,
        responseDataKeys: responseShape.keys,
        responseType: responseShape.responseType
    };
}
export function normalizeCompiledRoot(node) {
    const roots = Array.isArray(node) ? node : [node];
    const first = roots[0];
    return {
        rootCount: roots.length,
        firstType: first?.type,
        firstPath: first?.path
    };
}
