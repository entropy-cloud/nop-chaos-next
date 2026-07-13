import { useMemo, useState } from 'react';
import { icons } from 'lucide-react';
import { LowCodeIcon } from '@nop-chaos/core';
import { Button, Input, Popover, PopoverContent, PopoverTrigger, ScrollArea, cn } from '@nop-chaos/ui';
import type { VueFormItemComponentProps } from '@nop-chaos/amis-react';

const VISIBLE_STEP = 200;

function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const ICON_NAMES: string[] = Object.keys(icons)
  .map(pascalToKebab)
  .filter((name) => name.length > 0)
  .sort((a, b) => a.localeCompare(b));

export interface IconPickerProps extends VueFormItemComponentProps {
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function IconPicker({
  value,
  onValueChange,
  disabled,
  placeholder = '选择图标',
  className,
}: IconPickerProps) {
  const selected = typeof value === 'string' ? value : undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return keyword ? ICON_NAMES.filter((name) => name.includes(keyword)) : ICON_NAMES;
  }, [query]);

  const visible = filtered.slice(0, visibleCount);

  const handleSelect = (name: string) => {
    onValueChange?.(name);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery('');
        }
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn('w-full justify-start gap-2 font-normal', className)}
          />
        }
      >
        <LowCodeIcon name={selected} className="size-4 shrink-0" />
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ?? placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(VISIBLE_STEP);
          }}
          placeholder="搜索图标"
          className="mb-2"
        />
        <ScrollArea className="h-60">
          <div className="grid grid-cols-6 gap-1 p-1">
            {visible.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => handleSelect(name)}
                className={cn(
                  'flex size-9 items-center justify-center rounded-md border border-transparent hover:border-primary hover:bg-accent',
                  selected === name && 'border-primary bg-accent',
                )}
              >
                <LowCodeIcon name={name} className="size-4" />
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">无匹配图标</div>
          ) : null}
        </ScrollArea>
        <div className="mt-1 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>共 {filtered.length} 个</span>
          {visibleCount < filtered.length ? (
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => setVisibleCount((count) => count + VISIBLE_STEP)}
            >
              显示更多
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
