import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildOverview, DEFAULT_FILTERS } from './diagnostics';
const DEBUGGER_STYLE_ID = 'nop-debugger-styles';
const DEBUGGER_STYLES = `
.nop-theme-root {
  --nop-debugger-bg:
    linear-gradient(180deg, rgba(16, 24, 34, 0.96), rgba(10, 18, 27, 0.98)),
    radial-gradient(circle at top right, rgba(240, 183, 79, 0.16), transparent 42%);
  --nop-debugger-border: rgba(255, 255, 255, 0.08);
  --nop-debugger-shadow: 0 24px 72px rgba(7, 12, 18, 0.32);
  --nop-debugger-text: #eef4fb;
  --nop-debugger-eyebrow: #ffcf8b;
  --nop-debugger-chip-bg: rgba(255, 255, 255, 0.05);
  --nop-debugger-chip-border: rgba(255, 255, 255, 0.12);
  --nop-debugger-chip-active-bg: rgba(255, 207, 139, 0.18);
  --nop-debugger-chip-active-border: rgba(255, 207, 139, 0.34);
  --nop-debugger-chip-active-text: #ffcf8b;
  --nop-debugger-card-bg: rgba(255, 255, 255, 0.05);
  --nop-debugger-card-border: rgba(255, 255, 255, 0.08);
  --nop-debugger-muted-text: rgba(238, 244, 251, 0.7);
  --nop-debugger-detail-bg: rgba(0, 0, 0, 0.26);
  --nop-debugger-detail-text: #bce6ff;
  --nop-debugger-launcher-bg: rgba(16, 24, 34, 0.94);
  --nop-debugger-launcher-shadow: 0 8px 24px rgba(7, 12, 18, 0.32);
  --nop-debugger-badge-render-bg: rgba(120, 198, 255, 0.16);
  --nop-debugger-badge-render-text: #9bd9ff;
  --nop-debugger-badge-action-bg: rgba(255, 205, 128, 0.16);
  --nop-debugger-badge-action-text: #ffd18a;
  --nop-debugger-badge-api-bg: rgba(125, 235, 182, 0.16);
  --nop-debugger-badge-api-text: #9df3ca;
  --nop-debugger-badge-compile-bg: rgba(210, 183, 255, 0.16);
  --nop-debugger-badge-compile-text: #dcc0ff;
  --nop-debugger-badge-notify-bg: rgba(255, 158, 177, 0.16);
  --nop-debugger-badge-notify-text: #ffbac8;
  --nop-debugger-badge-error-bg: rgba(255, 128, 128, 0.18);
  --nop-debugger-badge-error-text: #ffadad;
}

.nop-debugger {
  position: fixed;
  z-index: 9999;
  width: min(420px, calc(100vw - 32px));
  max-height: min(78vh, 760px);
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(--nop-debugger-bg);
  border: 1px solid var(--nop-debugger-border);
  box-shadow: var(--nop-debugger-shadow);
  color: var(--nop-debugger-text);
  backdrop-filter: blur(16px);
}

.nop-debugger__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.nop-debugger__drag-handle {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.nop-debugger__header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.nop-debugger__eyebrow {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--nop-debugger-eyebrow);
}

.nop-debugger__header-actions,
.nop-debugger__tabs,
.nop-debugger__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nop-debugger__icon-button,
.nop-debugger__tab,
.nop-debugger__filter,
.nop-debugger-launcher {
  appearance: none;
  border: 1px solid var(--nop-debugger-chip-border);
  color: var(--nop-debugger-text);
  cursor: pointer;
}

.nop-debugger__icon-button,
.nop-debugger__tab,
.nop-debugger__filter {
  background: var(--nop-debugger-chip-bg);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.nop-debugger__tab[data-active],
.nop-debugger__filter[data-active] {
  background: var(--nop-debugger-chip-active-bg);
  border-color: var(--nop-debugger-chip-active-border);
  color: var(--nop-debugger-chip-active-text);
}

.nop-debugger__overview,
.nop-debugger__list {
  display: grid;
  gap: 10px;
  overflow: auto;
}

.nop-debugger__overview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.nop-debugger__metric-card,
.nop-debugger__entry {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--nop-debugger-card-bg);
  border: 1px solid var(--nop-debugger-card-border);
}

.nop-debugger__metric-card strong {
  font-size: 20px;
}

.nop-debugger__metric-card[data-error] strong {
  color: var(--nop-debugger-badge-error-text);
}

.nop-debugger__metric-label,
.nop-debugger__entry-meta,
.nop-debugger__entry time,
.nop-debugger-launcher__meta {
  font-size: 12px;
  color: var(--nop-debugger-muted-text);
}

.nop-debugger__entry-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.nop-debugger__entry-summary {
  font-size: 14px;
  line-height: 1.45;
}

.nop-debugger__entry-detail {
  display: block;
  overflow-x: auto;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--nop-debugger-detail-bg);
  color: var(--nop-debugger-detail-text);
  white-space: nowrap;
}

.nop-debugger__badge {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.nop-debugger__badge[data-group="render"] { background: var(--nop-debugger-badge-render-bg); color: var(--nop-debugger-badge-render-text); }
.nop-debugger__badge[data-group="action"] { background: var(--nop-debugger-badge-action-bg); color: var(--nop-debugger-badge-action-text); }
.nop-debugger__badge[data-group="api"] { background: var(--nop-debugger-badge-api-bg); color: var(--nop-debugger-badge-api-text); }
.nop-debugger__badge[data-group="compile"] { background: var(--nop-debugger-badge-compile-bg); color: var(--nop-debugger-badge-compile-text); }
.nop-debugger__badge[data-group="notify"] { background: var(--nop-debugger-badge-notify-bg); color: var(--nop-debugger-badge-notify-text); }
.nop-debugger__badge[data-group="error"] { background: var(--nop-debugger-badge-error-bg); color: var(--nop-debugger-badge-error-text); }

.nop-debugger__empty { margin: 0; color: var(--nop-debugger-muted-text); }

.nop-debugger-launcher {
  position: fixed;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  background: var(--nop-debugger-launcher-bg);
  box-shadow: var(--nop-debugger-launcher-shadow);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.nop-debugger-launcher:active {
  cursor: grabbing;
}

.nop-debugger-launcher__icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nop-debugger-launcher__label { font-size: 12px; font-weight: 600; }

@media (max-width: 760px) {
  .nop-debugger {
    width: calc(100vw - 24px);
    max-height: 72vh;
  }

  .nop-debugger__overview {
    grid-template-columns: 1fr;
  }
}
`;
const FILTER_LABELS = {
    render: 'Render',
    action: 'Action',
    api: 'API',
    compile: 'Compile',
    notify: 'Notify',
    error: 'Error'
};
function formatClock(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
function formatTraceSummary(trace) {
    if (!trace || trace.totalEvents === 0) {
        return {
            headline: 'No correlated trace yet',
            detail: 'Run an action or request to infer the latest chain.'
        };
    }
    const anchor = trace.anchorEvent?.summary ?? trace.latestError?.summary ?? trace.latestApi?.summary ?? trace.latestAction?.summary ?? 'Recent interaction';
    const relatedBits = [
        trace.resolvedQuery.nodeId ? `node ${trace.resolvedQuery.nodeId}` : undefined,
        trace.resolvedQuery.actionType ? `action ${trace.resolvedQuery.actionType}` : undefined,
        trace.resolvedQuery.requestKey ? 'request linked' : undefined
    ].filter(Boolean);
    return {
        headline: anchor,
        detail: `${trace.totalEvents} correlated event${trace.totalEvents === 1 ? '' : 's'}${relatedBits.length ? ` | ${relatedBits.join(' | ')}` : ''}`
    };
}
function useDebuggerSnapshot(controller) {
    const [snapshot, setSnapshot] = useState(controller.getSnapshot());
    useEffect(() => {
        setSnapshot(controller.getSnapshot());
        return controller.subscribe(() => {
            setSnapshot(controller.getSnapshot());
        });
    }, [controller]);
    return snapshot;
}
function useDraggablePosition(controller, initial) {
    const [position, setPosition] = useState(initial);
    const positionRef = useRef(initial);
    const dragState = useRef(null);
    useEffect(() => {
        positionRef.current = position;
    }, [position]);
    useEffect(() => {
        setPosition(initial);
        positionRef.current = initial;
    }, [initial]);
    useEffect(() => {
        const clearDrag = (event) => {
            if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
                return;
            }
            try {
                dragState.current.target.releasePointerCapture(event.pointerId);
            }
            catch (error) {
                void error;
            }
            controller.setPanelPosition(positionRef.current);
            dragState.current = null;
        };
        const handlePointerMove = (event) => {
            if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
                return;
            }
            if (event.buttons === 0) {
                clearDrag(event);
                return;
            }
            const next = {
                x: Math.max(12, event.clientX - dragState.current.offsetX),
                y: Math.max(12, event.clientY - dragState.current.offsetY)
            };
            positionRef.current = next;
            setPosition(next);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', clearDrag);
        window.addEventListener('pointercancel', clearDrag);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', clearDrag);
            window.removeEventListener('pointercancel', clearDrag);
        };
    }, [controller]);
    const bind = {
        onPointerDown(event) {
            if (event.button !== 0) {
                return;
            }
            const target = event.currentTarget.parentElement;
            if (!target) {
                return;
            }
            dragState.current = {
                pointerId: event.pointerId,
                offsetX: event.clientX - position.x,
                offsetY: event.clientY - position.y,
                target
            };
            target.setPointerCapture(event.pointerId);
            event.preventDefault();
        }
    };
    return { position, bind };
}
function useLauncherDrag(controller, initial) {
    const [position, setPosition] = useState(initial);
    const positionRef = useRef(initial);
    const dragState = useRef(null);
    const wasDraggedRef = useRef(false);
    const suppressNextClickRef = useRef(false);
    useEffect(() => {
        positionRef.current = position;
    }, [position]);
    useEffect(() => {
        setPosition(initial);
        positionRef.current = initial;
    }, [initial]);
    useEffect(() => {
        const clearDrag = (event) => {
            if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
                return;
            }
            try {
                dragState.current.target.releasePointerCapture(event.pointerId);
            }
            catch (error) {
                void error;
            }
            if (dragState.current.hasMoved) {
                controller.setPanelPosition(positionRef.current);
                wasDraggedRef.current = true;
                suppressNextClickRef.current = true;
            }
            dragState.current = null;
        };
        const handlePointerMove = (event) => {
            if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
                return;
            }
            if (event.buttons === 0) {
                clearDrag(event);
                return;
            }
            const deltaX = event.clientX - dragState.current.startX;
            const deltaY = event.clientY - dragState.current.startY;
            if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
                dragState.current.hasMoved = true;
            }
            if (!dragState.current.hasMoved) {
                return;
            }
            const newX = Math.max(8, Math.min(window.innerWidth - 80, dragState.current.startPosX + deltaX));
            const newY = Math.max(8, Math.min(window.innerHeight - 50, dragState.current.startPosY + deltaY));
            const next = { x: newX, y: newY };
            positionRef.current = next;
            setPosition(next);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', clearDrag);
        window.addEventListener('pointercancel', clearDrag);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', clearDrag);
            window.removeEventListener('pointercancel', clearDrag);
        };
    }, [controller]);
    const bind = {
        onPointerDown(event) {
            if (event.button !== 0) {
                return;
            }
            const target = event.currentTarget;
            wasDraggedRef.current = false;
            dragState.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startPosX: position.x,
                startPosY: position.y,
                hasMoved: false,
                target
            };
            target.setPointerCapture(event.pointerId);
            event.preventDefault();
        }
    };
    const consumeSuppressedClick = () => {
        if (!suppressNextClickRef.current) {
            return false;
        }
        suppressNextClickRef.current = false;
        wasDraggedRef.current = false;
        return true;
    };
    return { position, bind, wasDraggedRef, consumeSuppressedClick };
}
function useInjectDebuggerStyles(enabled) {
    useEffect(() => {
        if (!enabled || typeof document === 'undefined') {
            return;
        }
        let style = document.getElementById(DEBUGGER_STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = DEBUGGER_STYLE_ID;
            style.textContent = DEBUGGER_STYLES;
            document.head.appendChild(style);
        }
    }, [enabled]);
}
export function NopDebuggerPanel(props) {
    const snapshot = useDebuggerSnapshot(props.controller);
    const { position, bind } = useDraggablePosition(props.controller, snapshot.position);
    const { position: launcherPosition, bind: launcherBind, wasDraggedRef, consumeSuppressedClick } = useLauncherDrag(props.controller, snapshot.position);
    useInjectDebuggerStyles(snapshot.enabled);
    const filteredEvents = useMemo(() => snapshot.events.filter((event) => snapshot.filters.includes(event.group)), [snapshot.events, snapshot.filters]);
    const networkEvents = useMemo(() => filteredEvents.filter((event) => event.group === 'api'), [filteredEvents]);
    const overview = useMemo(() => buildOverview(snapshot.events), [snapshot.events]);
    const latestTrace = props.controller.createDiagnosticReport({
        eventLimit: 20,
        includeLatestInteractionTrace: true
    }).latestInteractionTrace;
    const latestTraceSummary = useMemo(() => formatTraceSummary(latestTrace), [latestTrace]);
    if (!snapshot.enabled) {
        return null;
    }
    if (!snapshot.panelOpen) {
        const errorCount = overview.errorCount;
        return (_jsxs("button", { type: "button", className: "nop-debugger-launcher nop-theme-root", style: { left: `${launcherPosition.x}px`, top: `${launcherPosition.y}px` }, onPointerDown: launcherBind.onPointerDown, onClick: (event) => {
                if (consumeSuppressedClick()) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                if (!wasDraggedRef.current) {
                    props.controller.show();
                }
            }, children: [_jsx("span", { className: "nop-debugger-launcher__icon", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }) }), _jsx("span", { className: "nop-debugger-launcher__label", children: errorCount > 0 ? `${errorCount} err` : `${snapshot.events.length}` })] }));
    }
    return (_jsxs("div", { className: "nop-debugger nop-theme-root", style: { left: `${position.x}px`, top: `${position.y}px` }, children: [_jsxs("div", { className: "nop-debugger__header", children: [_jsxs("div", { className: "nop-debugger__drag-handle", ...bind, children: [_jsx("p", { className: "nop-debugger__eyebrow", children: "Framework Debugger" }), _jsx("h2", { children: "Runtime Console" })] }), _jsxs("div", { className: "nop-debugger__header-actions", children: [_jsx("button", { type: "button", className: "nop-debugger__icon-button", onClick: () => (snapshot.paused ? props.controller.resume() : props.controller.pause()), children: snapshot.paused ? 'Resume' : 'Pause' }), _jsx("button", { type: "button", className: "nop-debugger__icon-button", onClick: () => props.controller.clear(), children: "Clear" }), _jsx("button", { type: "button", className: "nop-debugger__icon-button", onClick: () => props.controller.hide(), title: "Minimize", children: _jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", children: [_jsx("polyline", { points: "4 14 10 14 10 20" }), _jsx("polyline", { points: "20 10 14 10 14 4" }), _jsx("line", { x1: "14", y1: "10", x2: "21", y2: "3" }), _jsx("line", { x1: "3", y1: "21", x2: "10", y2: "14" })] }) })] })] }), _jsx("div", { className: "nop-debugger__tabs", role: "tablist", "aria-label": "Debugger tabs", children: ['overview', 'timeline', 'network'].map((tab) => (_jsx("button", { type: "button", className: "nop-debugger__tab", "data-active": snapshot.activeTab === tab ? '' : undefined, onClick: () => props.controller.setActiveTab(tab), children: tab }, tab))) }), snapshot.activeTab === 'overview' ? (_jsxs("div", { className: "nop-debugger__overview", children: [_jsxs("article", { className: "nop-debugger__metric-card", children: [_jsx("span", { className: "nop-debugger__metric-label", children: "Events" }), _jsx("strong", { children: overview.totalEvents }), _jsx("span", { children: snapshot.paused ? 'stream paused' : 'stream live' })] }), _jsxs("article", { className: "nop-debugger__metric-card", children: [_jsx("span", { className: "nop-debugger__metric-label", children: "Latest compile" }), _jsx("strong", { children: overview.latestCompile ? formatClock(overview.latestCompile.timestamp) : 'n/a' }), _jsx("span", { children: overview.latestCompile?.summary ?? 'No compile event yet' })] }), _jsxs("article", { className: "nop-debugger__metric-card", children: [_jsx("span", { className: "nop-debugger__metric-label", children: "Latest action" }), _jsx("strong", { children: overview.latestAction ? formatClock(overview.latestAction.timestamp) : 'n/a' }), _jsx("span", { children: overview.latestAction?.summary ?? 'No action event yet' })] }), _jsxs("article", { className: "nop-debugger__metric-card", children: [_jsx("span", { className: "nop-debugger__metric-label", children: "Latest API" }), _jsx("strong", { children: overview.latestApi ? formatClock(overview.latestApi.timestamp) : 'n/a' }), _jsx("span", { children: overview.latestApi?.summary ?? 'No API event yet' })] }), _jsxs("article", { className: "nop-debugger__metric-card", "data-error": "", children: [_jsx("span", { className: "nop-debugger__metric-label", children: "Errors" }), _jsx("strong", { children: overview.errorCount }), _jsx("span", { children: overview.errorCount > 0 ? 'Needs attention' : 'No errors recorded' })] }), _jsxs("article", { className: "nop-debugger__metric-card", children: [_jsx("span", { className: "nop-debugger__metric-label", children: "Latest trace" }), _jsx("strong", { children: latestTrace ? latestTrace.totalEvents : 0 }), _jsx("span", { children: latestTraceSummary.headline }), _jsx("span", { className: "nop-debugger__metric-label", children: latestTraceSummary.detail })] })] })) : null, snapshot.activeTab === 'timeline' ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "nop-debugger__filters", children: DEFAULT_FILTERS.map((filter) => {
                            const active = snapshot.filters.includes(filter);
                            return (_jsx("button", { type: "button", className: "nop-debugger__filter", "data-active": active ? '' : undefined, onClick: () => props.controller.toggleFilter(filter), children: FILTER_LABELS[filter] }, filter));
                        }) }), _jsxs("div", { className: "nop-debugger__list", children: [filteredEvents.length === 0 ? _jsx("p", { className: "nop-debugger__empty", children: "No events match the active filters." }) : null, filteredEvents.map((event) => (_jsxs("article", { className: "nop-debugger__entry", children: [_jsxs("div", { className: "nop-debugger__entry-topline", children: [_jsx("span", { className: "nop-debugger__badge", "data-group": event.group, children: event.group }), _jsx("time", { children: formatClock(event.timestamp) })] }), _jsx("strong", { className: "nop-debugger__entry-summary", children: event.summary }), _jsx("span", { className: "nop-debugger__entry-meta", children: event.source }), event.detail ? _jsx("code", { className: "nop-debugger__entry-detail", children: event.detail }) : null] }, event.id)))] })] })) : null, snapshot.activeTab === 'network' ? (_jsxs("div", { className: "nop-debugger__list", children: [networkEvents.length === 0 ? _jsx("p", { className: "nop-debugger__empty", children: "No network events recorded yet." }) : null, networkEvents.map((event) => (_jsxs("article", { className: "nop-debugger__entry", children: [_jsxs("div", { className: "nop-debugger__entry-topline", children: [_jsx("span", { className: "nop-debugger__badge", "data-group": event.group, children: event.kind }), _jsx("time", { children: formatClock(event.timestamp) })] }), _jsx("strong", { className: "nop-debugger__entry-summary", children: event.summary }), _jsxs("span", { className: "nop-debugger__entry-meta", children: [event.durationMs != null ? `${event.durationMs}ms` : 'pending', event.requestKey ? ` | ${event.requestKey}` : ''] }), event.detail ? _jsx("code", { className: "nop-debugger__entry-detail", children: event.detail }) : null] }, event.id)))] })) : null] }));
}
