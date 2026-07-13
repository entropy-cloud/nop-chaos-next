import { cn } from '@nop-chaos/ui';
import type { AppIconName } from '@nop-chaos/shared';
import { icons, type LucideIcon } from 'lucide-react';
import type { HTMLAttributes, JSX } from 'react';

export type AppIconProps = HTMLAttributes<HTMLSpanElement>;
export type AppIconComponent = (props: AppIconProps) => JSX.Element;

const faNameMap: Record<string, string> = {
  'badge-help': 'circle-question',
  blocks: 'cubes',
  'book-open-text': 'book-open',
  bot: 'robot',
  chartline: 'chart-line',
  cog: 'gear',
  cubes: 'cubes',
  database: 'database',
  edit: 'pen-to-square',
  'edit-3': 'pen-to-square',
  gear: 'gear',
  'git-branch': 'code-branch',
  globe: 'globe',
  'globe-2': 'globe',
  home: 'house',
  house: 'house',
  language: 'language',
  languages: 'language',
  'layout-dashboard': 'table-columns',
  'line-chart': 'chart-line',
  list: 'list',
  palette: 'palette',
  'panels-top-left': 'table-cells-large',
  plug: 'plug',
  'plug-zap': 'plug',
  puzzle: 'puzzle-piece',
  'puzzle-piece': 'puzzle-piece',
  'settings-2': 'gear',
  table: 'table',
  workflow: 'diagram-project',
};

function toIconLookupKey(value: string) {
  return value.trim().replace(/\s+/g, '-').replace(/_/g, '-').toLowerCase();
}

function resolveFontAwesomeName(iconName?: string, fallback: AppIconName = 'home') {
  if (!iconName) {
    return faNameMap[fallback];
  }
  const lookupKey = toIconLookupKey(iconName);
  return (faNameMap[lookupKey] ?? lookupKey) || faNameMap[fallback];
}

function hasFontAwesomeBaseClass(iconName: string) {
  return /(^|\s)(fa|fas|far|fab|fa-solid|fa-regular|fa-brands)(\s|$)/.test(iconName);
}

function isFontAwesomeIcon(iconName: string): boolean {
  return iconName.startsWith('fa-') || hasFontAwesomeBaseClass(iconName);
}

function kebabToPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getLucideIcon(iconName: string): LucideIcon | null {
  const resolvedName = resolveLucideName(iconName);
  const pascalName = kebabToPascalCase(resolvedName);
  const icon = (icons as Record<string, LucideIcon>)[pascalName];
  if (icon) {
    return icon;
  }
  return null;
}

const ANT_DESIGN_VARIANT_SUFFIX = /-(outlined|filled|twotone)$/;

const ANT_DESIGN_LUCIDE_MAP: Record<string, string> = {
  'account-book': 'book-copy',
  aim: 'target',
  alert: 'triangle-alert',
  'align-center': 'text-align-center',
  'align-left': 'text-align-left',
  'align-right': 'text-align-right',
  apartment: 'building-2',
  api: 'plug',
  appstore: 'layout-grid',
  'appstore-add': 'grid-2x2-plus',
  'area-chart': 'chart-area',
  'arrows-alt': 'move',
  audio: 'volume-2',
  'audio-muted': 'volume-x',
  audit: 'clipboard-check',
  backward: 'rewind',
  bank: 'landmark',
  'bar-chart': 'chart-bar',
  bars: 'menu',
  'bg-colors': 'paintbrush',
  block: 'ban',
  branches: 'git-branch',
  build: 'wrench',
  bulb: 'lightbulb',
  'caret-down': 'chevron-down',
  'caret-left': 'chevron-left',
  'caret-right': 'chevron-right',
  'caret-up': 'chevron-up',
  'carry-out': 'package-check',
  'check-circle': 'circle-check-big',
  'check-square': 'square-check',
  clear: 'eraser',
  'clock-circle': 'clock',
  close: 'x',
  'close-circle': 'circle-x',
  'close-square': 'square-x',
  'cloud-server': 'server',
  cluster: 'network',
  'code-sandbox': 'flask-conical',
  comment: 'message-circle',
  compress: 'minimize',
  'console-sql': 'database',
  contacts: 'contact',
  control: 'sliders-horizontal',
  'customer-service': 'headset',
  dashboard: 'gauge',
  desktop: 'monitor',
  disconnect: 'link-2-off',
  dislike: 'thumbs-down',
  dollar: 'dollar-sign',
  'dot-chart': 'chart-scatter',
  'double-left': 'chevrons-left',
  'double-right': 'chevrons-right',
  down: 'chevron-down',
  'down-circle': 'circle-chevron-down',
  'down-square': 'square-chevron-down',
  drag: 'grip-vertical',
  edit: 'square-pen',
  enter: 'corner-down-left',
  environment: 'map-pin',
  exclamation: 'triangle-alert',
  'exclamation-circle': 'circle-alert',
  'expand-alt': 'maximize',
  experiment: 'flask-conical',
  export: 'upload',
  'eye-invisible': 'eye-off',
  fall: 'trending-down',
  'fast-backward': 'skip-back',
  'field-binary': 'binary',
  'field-number': 'hash',
  'field-string': 'type',
  'field-time': 'clock',
  'file-add': 'file-plus',
  'file-done': 'file-check',
  'file-excel': 'file-spreadsheet',
  'file-exclamation': 'file',
  'file-gif': 'file-image',
  'file-jpg': 'file-image',
  'file-markdown': 'file-text',
  'file-pdf': 'file-text',
  'file-ppt': 'presentation',
  'file-protect': 'shield-check',
  'file-sync': 'file',
  'file-unknown': 'file-question-mark',
  'file-word': 'file-text',
  'file-zip': 'file-archive',
  filter: 'funnel',
  fire: 'flame',
  'folder-add': 'folder-plus',
  'folder-view': 'folder-search',
  'font-colors': 'palette',
  'font-size': 'case-sensitive',
  fork: 'git-fork',
  'format-painter': 'paintbrush',
  'fullscreen-exit': 'minimize',
  function: 'square-function',
  gateway: 'router',
  gif: 'file-image',
  global: 'globe',
  hdd: 'hard-drive',
  'heat-map': 'grid-3x3',
  highlight: 'highlighter',
  home: 'house',
  idcard: 'id-card',
  'info-circle': 'info',
  layout: 'layout-dashboard',
  left: 'chevron-left',
  'left-circle': 'circle-chevron-left',
  'left-square': 'square-chevron-left',
  like: 'thumbs-up',
  line: 'minus',
  'line-chart': 'chart-line',
  loading: 'loader-circle',
  'loading-3-quarters': 'loader-circle',
  login: 'log-in',
  logout: 'log-out',
  'mac-command': 'command',
  man: 'user',
  'medicine-box': 'pill',
  message: 'message-square',
  'minus-circle': 'circle-minus',
  'minus-square': 'square-minus',
  mobile: 'smartphone',
  'money-collect': 'banknote',
  more: 'ellipsis',
  'node-collapse': 'chevrons-down-up',
  'node-expand': 'chevrons-up-down',
  'node-index': 'list-tree',
  notification: 'bell',
  number: 'hash',
  'ordered-list': 'list-ordered',
  'paper-clip': 'paperclip',
  'pause-circle': 'circle-pause',
  'pay-circle': 'credit-card',
  percentage: 'percent',
  'pic-center': 'image',
  picture: 'image',
  'pie-chart': 'chart-pie',
  'play-circle': 'circle-play',
  'play-square': 'square-play',
  'plus-circle': 'circle-plus',
  'plus-square': 'square-plus',
  pound: 'pound-sterling',
  poweroff: 'power',
  profile: 'user-round',
  project: 'folder-kanban',
  'pull-request': 'git-pull-request',
  pushpin: 'pin',
  qrcode: 'qr-code',
  question: 'circle-question-mark',
  'question-circle': 'circle-question-mark',
  'radar-chart': 'radar',
  reload: 'refresh-cw',
  rest: 'armchair',
  retweet: 'repeat',
  right: 'chevron-right',
  'right-circle': 'circle-chevron-right',
  'right-square': 'square-chevron-right',
  rise: 'trending-up',
  robot: 'bot',
  rollback: 'undo-2',
  'rotate-left': 'rotate-ccw',
  'rotate-right': 'rotate-cw',
  safety: 'shield',
  'safety-certificate': 'shield-check',
  schedule: 'calendar-clock',
  scissor: 'scissors',
  'security-scan': 'scan-search',
  select: 'text-cursor',
  setting: 'settings',
  'share-alt': 'share',
  shop: 'store',
  shopping: 'shopping-bag',
  'shopping-cart': 'shopping-cart',
  sliders: 'sliders-horizontal',
  snippets: 'scissors',
  solution: 'puzzle',
  'sort-ascending': 'arrow-up-narrow-wide',
  'sort-descending': 'arrow-down-wide-narrow',
  sound: 'volume-2',
  stop: 'circle-stop',
  subnode: 'git-fork',
  swap: 'arrow-left-right',
  switcher: 'layout-grid',
  sync: 'refresh-cw',
  team: 'users',
  thunderbolt: 'zap',
  'to-top': 'arrow-up-to-line',
  tool: 'wrench',
  transaction: 'receipt',
  translation: 'languages',
  unlock: 'lock-open',
  'unordered-list': 'list',
  up: 'chevron-up',
  'up-circle': 'circle-chevron-up',
  'up-square': 'square-chevron-up',
  'user-add': 'user-plus',
  'user-delete': 'user-minus',
  'user-switch': 'user-cog',
  'usergroup-add': 'users',
  verified: 'badge-check',
  'video-camera': 'video',
  'video-camera-add': 'video',
  warning: 'triangle-alert',
  wifi: 'wifi',
  woman: 'user',
};

function resolveLucideName(iconName: string): string {
  const colonIndex = iconName.indexOf(':');

  if (colonIndex === -1) {
    return iconName;
  }

  const prefix = iconName.slice(0, colonIndex).toLowerCase();
  let name = iconName.slice(colonIndex + 1).replace(ANT_DESIGN_VARIANT_SUFFIX, '');

  if (prefix === 'ant-design') {
    name = ANT_DESIGN_LUCIDE_MAP[name] ?? name;
  }

  return name;
}

function buildFontAwesomeClassName(iconName?: string, fallback: AppIconName = 'home') {
  const trimmedIconName = iconName?.trim();

  if (!trimmedIconName) {
    return `fa fa-${faNameMap[fallback]}`;
  }

  if (hasFontAwesomeBaseClass(trimmedIconName)) {
    return trimmedIconName;
  }

  if (/(^|\s)fa-[\w-]+(\s|$)/.test(trimmedIconName)) {
    return `fa ${trimmedIconName}`;
  }

  return `fa fa-${resolveFontAwesomeName(trimmedIconName, fallback)}`;
}

export function getIconByName(iconName?: string, fallback: AppIconName = 'home'): AppIconComponent {
  return function AppIcon({ className, title, ...props }: AppIconProps) {
    const accessibilityProps = title
      ? {
          'aria-label': title,
          role: 'img' as const,
        }
      : {
          'aria-hidden': true as const,
        };

    const trimmedIconName = iconName?.trim();

    // Check if it's a FontAwesome icon (fa-xxx format)
    if (trimmedIconName && isFontAwesomeIcon(trimmedIconName)) {
      return (
        <span
          className={cn('inline-flex items-center justify-center leading-none', className)}
          title={title}
          {...accessibilityProps}
          {...props}
        >
          <i className={buildFontAwesomeClassName(trimmedIconName, fallback)} />
        </span>
      );
    }

    // Try Lucide icon (kebab-case name)
    if (trimmedIconName) {
      const LucideIcon = getLucideIcon(trimmedIconName);
      if (LucideIcon) {
        return (
          <span
            className={cn('inline-flex items-center justify-center leading-none', className)}
            title={title}
            {...accessibilityProps}
            {...props}
          >
            <LucideIcon className="size-4" />
          </span>
        );
      }
    }

    // Fall back to FontAwesome
    return (
      <span
        className={cn('inline-flex items-center justify-center leading-none', className)}
        title={title}
        {...accessibilityProps}
        {...props}
      >
        <i className={buildFontAwesomeClassName(trimmedIconName, fallback)} />
      </span>
    );
  };
}

export function resolveIcon(iconName?: string): AppIconComponent {
  return getIconByName(iconName, 'home');
}

export function renderIcon(
  iconName?: string,
  props?: AppIconProps,
  fallback: AppIconName = 'home',
) {
  const Icon = getIconByName(iconName, fallback);
  return Icon(props ?? {});
}
