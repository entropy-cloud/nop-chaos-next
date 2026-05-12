import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import type { MenuItem } from '@nop-chaos/shared';
import { matchMenuPath } from '@nop-chaos/shared';
import { HoverCard, HoverCardContent, HoverCardTrigger, cn } from '@nop-chaos/ui';
import { renderIcon } from '../utils/icon-map';

interface SidebarProps {
  items: MenuItem[];
  activePath: string;
  expandedIds: string[];
  collapsed: boolean;
  brand: ReactNode;
  footer: ReactNode;
  onNavigate: (path: string) => void;
  onToggleGroup: (id: string) => void;
  className?: string;
}

interface SidebarItemProps {
  item: MenuItem;
  activePath: string;
  expandedIds: string[];
  collapsed: boolean;
  depth: number;
  onNavigate: (path: string) => void;
  onToggleGroup: (id: string) => void;
}

function isActive(item: MenuItem, activePath: string): boolean {
  if (matchMenuPath(item.path, activePath)) {
    return true;
  }

  return item.children?.some((child) => isActive(child, activePath)) ?? false;
}

function getMenuLabel(item: MenuItem) {
  return item.title ?? item.titleKey ?? item.id;
}

interface CollapsedSidebarFlyoutProps {
  item: MenuItem;
  activePath: string;
  onNavigate: (path: string) => void;
}

function CollapsedSidebarFlyout({ item, activePath, onNavigate }: CollapsedSidebarFlyoutProps) {
  const title = getMenuLabel(item);
  const children = item.children?.filter((child) => !child.hideInMenu) ?? [];

  return (
    <div className="w-64 space-y-2">
      <div className="border-b border-[hsl(var(--border))] pb-2 text-sm font-semibold text-foreground">
        {title}
      </div>
      {children.length > 0 ? (
        <div className="space-y-1">
          {children.map((child) => {
            const active = isActive(child, activePath);

            return (
              <button
                key={child.id}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors duration-200',
                  active
                    ? 'bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)] text-[hsl(var(--primary-dark))]'
                    : 'text-[hsl(var(--gray-800))] hover:bg-[color-mix(in_hsl,hsl(var(--primary))_8%,transparent)] hover:text-foreground dark:text-[hsl(var(--gray-700))] dark:hover:bg-white/10',
                )}
                onClick={() => onNavigate(child.path)}
                type="button"
              >
                {renderIcon(child.icon, { className: 'size-4 shrink-0' })}
                <span className="min-w-0 flex-1 truncate">{getMenuLabel(child)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{title}</div>
      )}
    </div>
  );
}

function SidebarItem({
  item,
  activePath,
  expandedIds,
  collapsed,
  depth,
  onNavigate,
  onToggleGroup,
}: SidebarItemProps) {
  if (item.hideInMenu) {
    return null;
  }

  const hasChildren = Boolean(item.children?.length);
  const expanded = expandedIds.includes(item.id);
  const childActive = item.children?.some((child) => isActive(child, activePath)) ?? false;
  const directActive = !hasChildren && matchMenuPath(item.path, activePath);
  const branchActive = hasChildren && childActive;
  const groupHoverClassName =
    'hover:bg-[hsl(var(--gray-100))] hover:text-[hsl(var(--gray-800))] dark:hover:bg-white/8 dark:hover:text-foreground';
  const leafHoverClassName =
    'hover:bg-[color-mix(in_hsl,hsl(var(--primary))_8%,transparent)] hover:text-foreground dark:hover:bg-white/10';
  const buttonClassName = cn(
    'group/sidebar-item relative flex items-center text-sm font-medium transition-colors duration-200',
    directActive
      ? 'rounded-r-[var(--radius-md)] bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)] text-[hsl(var(--primary-dark))] before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[3px] before:rounded-r-full before:bg-[hsl(var(--primary))]'
      : branchActive
        ? cn('text-[hsl(var(--gray-800))] dark:text-[hsl(var(--gray-800))]', groupHoverClassName)
        : hasChildren
          ? cn('rounded-[var(--radius-md)] text-[hsl(var(--gray-700))]', groupHoverClassName)
          : cn(
              'rounded-[var(--radius-md)] text-[hsl(var(--gray-800))] dark:text-[hsl(var(--gray-700))]',
              leafHoverClassName,
            ),
    collapsed ? 'justify-center' : '',
  );
  const itemOffsetStyle = collapsed || depth === 0 ? undefined : { paddingLeft: `${depth * 14}px` };

  const handleItemClick = () => {
    if (hasChildren) {
      onToggleGroup(item.id);
      return;
    }

    onNavigate(item.path);
  };

  const itemButton = (
    <button
      className={cn(
        'flex min-w-0 flex-1 cursor-pointer items-center py-2.5 text-left',
        collapsed ? 'justify-center px-2.5' : 'gap-3 px-3',
      )}
      onClick={handleItemClick}
      title={collapsed ? getMenuLabel(item) : undefined}
      type="button"
    >
      {renderIcon(item.icon, { className: 'size-4 shrink-0' })}
      {collapsed ? null : (
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{getMenuLabel(item)}</span>
      )}
    </button>
  );

  const content = collapsed ? (
    hasChildren ? (
      <HoverCard>
        <HoverCardTrigger delay={120} closeDelay={160}>
          {itemButton}
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-72 border-[hsl(var(--border))] bg-[var(--card-surface)] p-3 shadow-lg backdrop-blur-2xl"
          side="right"
          sideOffset={10}
        >
          <CollapsedSidebarFlyout item={item} activePath={activePath} onNavigate={onNavigate} />
        </HoverCardContent>
      </HoverCard>
    ) : (
      <HoverCard>
        <HoverCardTrigger delay={120} closeDelay={120}>
          {itemButton}
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-auto border-[hsl(var(--border))] bg-[var(--card-surface)] px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-2xl"
          side="right"
          sideOffset={10}
        >
          {getMenuLabel(item)}
        </HoverCardContent>
      </HoverCard>
    )
  ) : (
    itemButton
  );

  return (
    <div className="space-y-1" style={itemOffsetStyle}>
      <div className={buttonClassName}>
        {content}
        {hasChildren && !collapsed ? (
          <button
            className="mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-current/80 transition-colors hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
            onClick={() => onToggleGroup(item.id)}
            type="button"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                expanded ? 'rotate-90' : '',
              )}
            />
          </button>
        ) : null}
      </div>
      {hasChildren && !collapsed ? (
        <div
          className={cn(
            'grid overflow-hidden transition-all duration-300',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-1 pt-1">
              {item.children?.map((child) => (
                <SidebarItem
                  key={child.id}
                  item={child}
                  activePath={activePath}
                  expandedIds={expandedIds}
                  collapsed={collapsed}
                  depth={depth + 1}
                  onNavigate={onNavigate}
                  onToggleGroup={onToggleGroup}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  items,
  activePath,
  expandedIds,
  collapsed,
  brand,
  footer,
  onNavigate,
  onToggleGroup,
  className,
}: SidebarProps) {
  return (
    <div
      className={cn(
        'relative flex h-screen flex-col overflow-hidden border-r border-[hsl(var(--border))] bg-[var(--app-sidebar-bg)] px-3 py-4 backdrop-blur-lg',
        collapsed
          ? 'w-[var(--sidebar-width-collapsed,5rem)]'
          : 'w-[var(--sidebar-width-expanded,18rem)]',
        className,
      )}
    >
      <div className="mb-6">{brand}</div>
      <div
        className={cn(
          'menu-scroll flex-1 space-y-2 overflow-y-auto',
          collapsed ? 'pr-0' : 'pr-1 menu-scroll-expanded',
        )}
      >
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            activePath={activePath}
            expandedIds={expandedIds}
            collapsed={collapsed}
            depth={0}
            onNavigate={onNavigate}
            onToggleGroup={onToggleGroup}
          />
        ))}
      </div>
      <div className="mt-4 border-t border-[hsl(var(--border))] pt-4">{footer}</div>
    </div>
  );
}
