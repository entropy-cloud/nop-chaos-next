/**
 * @nop-chaos/theme-tokens
 *
 * This package is CSS-only. Its primary artifact is `styles.css`, which defines
 * all design tokens as CSS custom properties. The `exports` map in package.json
 * exposes `./styles.css` for direct CSS import.
 *
 * The JS entry exists solely to satisfy TypeScript's module resolution and to
 * provide token name constants for JS/TS consumers that need to reference token
 * names programmatically (e.g., dynamic style applications, test assertions).
 */

export const TOKEN_NAMES = {
  RADIUS_SM: '--radius-sm',
  RADIUS_MD: '--radius-md',
  RADIUS_LG: '--radius-lg',
  RADIUS_XL: '--radius-xl',
  RADIUS: '--radius',
  ICON_SM: '--icon-sm',
  ICON_MD: '--icon-md',
  ICON_LG: '--icon-lg',
  ICON_XL: '--icon-xl',
  TRANSITION_FAST: '--transition-fast',
  TRANSITION_BASE: '--transition-base',
  TRANSITION_SLOW: '--transition-slow',
  SPACE_PAGE_BODY: '--space-page-body',
  SPACE_SECTION_GAP: '--space-section-gap',
  SPACE_FORM_ITEM_GAP: '--space-form-item-gap',
} as const;

export type TokenName = (typeof TOKEN_NAMES)[keyof typeof TOKEN_NAMES];
