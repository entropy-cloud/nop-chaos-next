import * as React from 'react';
import { Undo2Icon, Redo2Icon } from 'lucide-react';
import { t } from '../../lib/i18n.js';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';

interface UndoRedoControlsProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  disabled?: boolean;
  className?: string;
}

function UndoRedoControls({
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  disabled,
  className,
}: UndoRedoControlsProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={disabled || !canUndo}
        aria-label={t('flux.common.undo')}
        onClick={onUndo}
      >
        <Undo2Icon />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={disabled || !canRedo}
        aria-label={t('flux.common.redo')}
        onClick={onRedo}
      >
        <Redo2Icon />
      </Button>
    </div>
  );
}

export { UndoRedoControls, type UndoRedoControlsProps };
