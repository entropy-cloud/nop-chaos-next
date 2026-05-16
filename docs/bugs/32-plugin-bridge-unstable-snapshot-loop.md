# 32 Plugin Bridge Unstable Snapshot Loop

## Problem

- The plugin demo page could fail to render and crash with `Maximum update depth exceeded`.
- The visible symptom appeared when opening the remote plugin route in the host shell.
- The plugin component itself did not contain a local `setState` loop, which made the failure misleading.

## Diagnostic Method

- Started from `examples/plugin-demo/src/index.tsx` and confirmed the demo page had no local state/effect writes that could explain the loop.
- Traced the plugin page data sources into `@nop-chaos/plugin-bridge` hooks, especially `usePluginManifest()` because the demo reads manifest settings during render.
- Checked the host bridge implementation in `apps/main/src/App.tsx` and compared it against the `useSyncExternalStore` contract used by the bridge package.
- The decisive evidence was that `getPluginBridgeSnapshot()` and host `pluginBridge.getSnapshot()` could both return a fresh object on every read, which React treats as a changing external-store snapshot and re-renders until hitting the nested update limit.

## Root Cause

- `packages/plugin-bridge/src/bridge.ts` created a new fallback snapshot object on every call when no bridge was present.
- `apps/main/src/App.tsx` returned a new object from `pluginBridge.getSnapshot()` instead of the memoized `bridgeSnapshot` reference.
- `useSyncExternalStore` requires snapshot identity to stay stable between store updates; violating that contract caused the plugin page to re-enter rendering continuously.

## Fix

- Added a module-level stable fallback snapshot in `packages/plugin-bridge/src/bridge.ts`.
- Updated `apps/main/src/App.tsx` so `pluginBridge.getSnapshot()` returns the memoized `bridgeSnapshot` object directly.
- This keeps bridge snapshot identity stable until an actual host store or i18n change occurs, which matches the external-store contract expected by React.

## Tests

- `packages/plugin-bridge/src/index.test.ts` verifies missing-bridge fallback snapshots stay referentially stable and bridge-provided snapshots are not cloned on repeated reads.

## Affected Files

- `apps/main/src/App.tsx`
- `packages/plugin-bridge/src/bridge.ts`
- `packages/plugin-bridge/src/index.test.ts`

## Notes For Future Refactors

- Any function used as a `useSyncExternalStore` snapshot getter must return the exact same object reference until the underlying store actually changes.
- Avoid rebuilding bridge snapshot objects inside getters just to mirror current state; memoize first and return the memoized value.
