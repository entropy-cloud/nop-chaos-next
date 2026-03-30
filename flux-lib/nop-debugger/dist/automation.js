export function createAutomationApi(input) {
    return {
        controllerId: input.controllerId,
        sessionId: input.sessionId,
        version: '1',
        getSnapshot: input.getSnapshot,
        getOverview: input.getOverview,
        queryEvents: input.queryEvents,
        getLatestEvent: input.getLatestEvent,
        getLatestError: input.getLatestError,
        getEarliestErrors: input.getEarliestErrors,
        getLatestErrors: input.getLatestErrors,
        getPinnedErrors: input.getPinnedErrors,
        getNodeDiagnostics: input.getNodeDiagnostics,
        getInteractionTrace: input.getInteractionTrace,
        createDiagnosticReport: input.createDiagnosticReport,
        exportSession: input.exportSession,
        waitForEvent: input.waitForEvent,
        clear: input.clear,
        pause: input.pause,
        resume: input.resume,
        show: input.show,
        hide: input.hide,
        toggle: input.toggle,
        setActiveTab: input.setActiveTab,
        setPanelPosition: input.setPanelPosition
    };
}
export function registerAutomationApi(controllerId, automation) {
    if (typeof window === 'undefined') {
        return;
    }
    const existingHub = window.__NOP_DEBUGGER_HUB__;
    const hub = existingHub ?? {
        activeControllerId: controllerId,
        controllers: {},
        listControllers() {
            return Object.keys(this.controllers);
        },
        getController(targetControllerId) {
            const resolvedId = targetControllerId ?? this.activeControllerId;
            return resolvedId ? this.controllers[resolvedId] : undefined;
        }
    };
    hub.controllers[controllerId] = automation;
    hub.activeControllerId = controllerId;
    window.__NOP_DEBUGGER_HUB__ = hub;
    window.__NOP_DEBUGGER_API__ = automation;
}
export function getNopDebuggerAutomationApi(controllerId) {
    if (typeof window === 'undefined') {
        return undefined;
    }
    if (!controllerId) {
        return window.__NOP_DEBUGGER_API__;
    }
    return window.__NOP_DEBUGGER_HUB__?.getController(controllerId);
}
export function installNopDebuggerWindowFlag(input) {
    if (typeof window !== 'undefined') {
        window.__NOP_DEBUGGER__ = typeof input === 'object' && input !== null && 'config' in input ? input.config : input;
    }
}
