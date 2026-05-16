# Icon System

## Architecture

Dynamic icon resolution lives in `packages/core/src/utils/iconMap.tsx`. It provides three public entry points:

- `getIconByName(name, fallback?)` — returns a React component that renders the icon
- `renderIcon(name, props?, fallback?)` — renders an icon inline (convenience wrapper)
- `resolveIcon(name)` — alias for `getIconByName(name, 'home')`

The file also exports `AppIconProps` and `AppIconComponent` types.

## Usage Conventions

### Static icons — direct import

When the icon is known at authoring time (e.g. a fixed UI element), import it directly from `lucide-react`:

```tsx
import { Settings, Home } from 'lucide-react';

<Settings className="size-4" />
```

This is idiomatic React. Tree-shaking ensures only the used icons end up in the bundle.

### Dynamic icons — use the unified layer

When the icon name comes from configuration, a backend response, or any runtime source, use `renderIcon` or `getIconByName`:

```tsx
import { renderIcon } from '@nop-chaos/core';

<span>{renderIcon(menuItem.icon)}</span>
```

Do **not** use `import * as LucideIcons` or index into the `icons` map from consumer code. The unified layer handles:

1. FontAwesome class detection (`fa-*`, `fa fa-*`, `fa-solid fa-*`)
2. Lucide kebab-case → PascalCase lookup
3. Alias resolution via `faNameMap`
4. Fallback to a default icon

### Adding new configurable icons

1. Add the canonical name to `appIconNames` in `packages/shared/src/types/icon.ts`
2. Add the FontAwesome class name mapping to `faNameMap` in `packages/core/src/utils/iconMap.tsx`

## Name Resolution Chain

1. If the input matches a FontAwesome pattern → render as FA `<i>` element
2. Convert kebab-case to PascalCase and look up in `lucide-react` icons map → render as Lucide `<svg>`
3. Fall back to FontAwesome class via `faNameMap` alias → render as FA `<i>`
4. Final fallback: default icon (`home`)
