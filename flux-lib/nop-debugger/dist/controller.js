import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters';
import { createAutomationApi, getNopDebuggerAutomationApi as getAutomationApi, installNopDebuggerWindowFlag, registerAutomationApi } from './automation';
import { createSessionId, readWindowConfig } from './controller-helpers';
import { applyEventQuery, buildInteractionTrace, buildNodeDiagnostics, buildOverview, buildSessionExport, createDiagnosticReport } from './diagnostics';
import { normalizeRedactionOptions } from './redaction';
import { createDebuggerStore } from './store';
export function createNopDebugger(options = {}) {
    const windowConfig = readWindowConfig();
    const enabled = options.enabled ?? windowConfig.enabled;
    const debuggerId = options.id ?? 'default';
    const sessionId = createSessionId(debuggerId);
    const maxEvents = options.maxEvents ?? 400;
    const exposeAutomationApi = options.exposeAutomationApi ?? true;
    const redaction = normalizeRedactionOptions(options.redaction);
    const store = createDebuggerStore({
        enabled,
        sessionId,
        maxEvents,
        defaultOpen: windowConfig.defaultOpen,
        defaultTab: windowConfig.defaultTab,
        position: windowConfig.position,
        errorBufferKeepEarliest: options.errorBuffer?.keepEarliest ?? 3,
        errorBufferKeepLatest: options.errorBuffer?.keepLatest ?? 5
    });
    const requestState = new Map();
    const getSnapshot = () => store.getSnapshot();
    const getOverview = () => buildOverview(getSnapshot().events);
    const queryEvents = (query) => applyEventQuery(getSnapshot().events, query);
    const getLatestEvent = (query) => queryEvents({ ...query, limit: 1 })[0];
    const getLatestError = () => getLatestEvent({ group: 'error' });
    const getEarliestErrors = () => getSnapshot().pinnedErrors.earliest;
    const getLatestErrors = () => getSnapshot().pinnedErrors.latest;
    const getPinnedErrors = () => getSnapshot().pinnedErrors;
    const getNodeDiagnostics = (nodeOptions) => buildNodeDiagnostics(getSnapshot().events, nodeOptions);
    const getInteractionTrace = (traceQuery) => buildInteractionTrace(getSnapshot().events, traceQuery);
    const createReport = (reportOptions) => createDiagnosticReport(debuggerId, getSnapshot(), reportOptions);
    const exportSession = (sessionOptions) => buildSessionExport(debuggerId, sessionId, getSnapshot(), redaction, sessionOptions);
    const waitForEvent = (waitOptions) => {
        const timeoutMs = waitOptions?.timeoutMs ?? 5000;
        const immediate = getLatestEvent(waitOptions);
        if (immediate) {
            return Promise.resolve(immediate);
        }
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const unsubscribe = store.subscribe(() => {
                const next = getLatestEvent({
                    ...waitOptions,
                    sinceTimestamp: waitOptions?.sinceTimestamp ?? startedAt
                });
                if (next) {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(next);
                }
            });
            const timer = setTimeout(() => {
                unsubscribe();
                reject(new Error(`Timed out waiting for debugger event after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    };
    const automation = createAutomationApi({
        controllerId: debuggerId,
        sessionId,
        getSnapshot,
        getOverview,
        queryEvents,
        getLatestEvent,
        getLatestError,
        getEarliestErrors,
        getLatestErrors,
        getPinnedErrors,
        getNodeDiagnostics,
        getInteractionTrace,
        createDiagnosticReport: createReport,
        exportSession,
        waitForEvent,
        clear() {
            store.clear();
        },
        pause() {
            store.pause();
        },
        resume() {
            store.resume();
        },
        show() {
            store.show();
        },
        hide() {
            store.hide();
        },
        toggle() {
            store.toggle();
        },
        setActiveTab(tab) {
            store.setActiveTab(tab);
        },
        setPanelPosition(position) {
            store.setPosition(position);
        }
    });
    const plugin = createDebuggerPlugin(store);
    const controller = {
        id: debuggerId,
        enabled,
        plugin,
        sessionId,
        automation,
        decorateEnv(env) {
            return decorateDebuggerEnv({
                enabled,
                env,
                store,
                redaction,
                requestState
            });
        },
        onActionError(error, ctx) {
            appendActionErrorEvent(store, error, ctx);
        },
        show() {
            store.show();
        },
        hide() {
            store.hide();
        },
        toggle() {
            store.toggle();
        },
        clear() {
            store.clear();
        },
        pause() {
            store.pause();
        },
        resume() {
            store.resume();
        },
        setActiveTab(tab) {
            store.setActiveTab(tab);
        },
        setPanelPosition(position) {
            store.setPosition(position);
        },
        toggleFilter(filter) {
            store.toggleFilter(filter);
        },
        queryEvents,
        getLatestEvent,
        getLatestError,
        getEarliestErrors,
        getLatestErrors,
        getPinnedErrors,
        getNodeDiagnostics,
        getInteractionTrace,
        getOverview,
        createDiagnosticReport: createReport,
        exportSession,
        waitForEvent,
        subscribe(listener) {
            return store.subscribe(listener);
        },
        getSnapshot
    };
    if (exposeAutomationApi) {
        registerAutomationApi(debuggerId, automation);
    }
    return controller;
}
export function getNopDebuggerAutomationApi(controllerId) {
    return getAutomationApi(controllerId);
}
export { installNopDebuggerWindowFlag };
export function createNopDiagnosticReport(controller, options) {
    return controller.createDiagnosticReport(options);
}
