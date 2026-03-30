import { DEFAULT_FILTERS } from './diagnostics';
export function createDebuggerStore(input) {
    const listeners = new Set();
    let notifyScheduled = false;
    let snapshot = {
        enabled: input.enabled,
        panelOpen: input.defaultOpen,
        paused: false,
        activeTab: input.defaultTab,
        position: input.position,
        events: [],
        filters: [...DEFAULT_FILTERS],
        pinnedErrors: { earliest: [], latest: [] }
    };
    let nextId = 1;
    const notify = () => {
        notifyScheduled = false;
        listeners.forEach((listener) => listener());
    };
    const scheduleNotify = () => {
        if (notifyScheduled) {
            return;
        }
        notifyScheduled = true;
        queueMicrotask(() => {
            notify();
        });
    };
    const setSnapshot = (updater) => {
        snapshot = updater(snapshot);
        scheduleNotify();
    };
    const isErrorLevel = (level) => level === 'error' || level === 'warning';
    const updatePinnedErrors = (pinned, event) => {
        const keepEarliest = input.errorBufferKeepEarliest;
        const keepLatest = input.errorBufferKeepLatest;
        if (keepEarliest === 0 && keepLatest === 0) {
            return pinned;
        }
        let earliest = [...pinned.earliest];
        let latest = [...pinned.latest];
        if (keepEarliest > 0 && earliest.length < keepEarliest) {
            earliest = [...earliest, event];
        }
        if (keepLatest > 0) {
            latest = [...latest, event];
            if (latest.length > keepLatest) {
                latest = latest.slice(-keepLatest);
            }
        }
        return { earliest, latest };
    };
    return {
        getSnapshot() {
            return snapshot;
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        append(event) {
            if (!snapshot.enabled || snapshot.paused) {
                return;
            }
            const timestamp = event.timestamp ?? Date.now();
            const fullEvent = {
                ...event,
                id: nextId++,
                sessionId: input.sessionId,
                timestamp
            };
            setSnapshot((current) => {
                const newEvents = [fullEvent, ...current.events].slice(0, input.maxEvents);
                const newPinnedErrors = isErrorLevel(fullEvent.level)
                    ? updatePinnedErrors(current.pinnedErrors, fullEvent)
                    : current.pinnedErrors;
                return {
                    ...current,
                    events: newEvents,
                    pinnedErrors: newPinnedErrors
                };
            });
        },
        clear() {
            setSnapshot((current) => ({ ...current, events: [], pinnedErrors: { earliest: [], latest: [] } }));
        },
        show() {
            setSnapshot((current) => ({ ...current, panelOpen: true }));
        },
        hide() {
            setSnapshot((current) => ({ ...current, panelOpen: false }));
        },
        toggle() {
            setSnapshot((current) => ({ ...current, panelOpen: !current.panelOpen }));
        },
        pause() {
            setSnapshot((current) => ({ ...current, paused: true }));
        },
        resume() {
            setSnapshot((current) => ({ ...current, paused: false }));
        },
        setActiveTab(tab) {
            setSnapshot((current) => ({ ...current, activeTab: tab }));
        },
        setPosition(position) {
            setSnapshot((current) => ({ ...current, position }));
        },
        toggleFilter(filter) {
            setSnapshot((current) => {
                const exists = current.filters.includes(filter);
                if (exists) {
                    if (current.filters.length === 1) {
                        return current;
                    }
                    return {
                        ...current,
                        filters: current.filters.filter((item) => item !== filter)
                    };
                }
                return {
                    ...current,
                    filters: [...current.filters, filter]
                };
            });
        }
    };
}
