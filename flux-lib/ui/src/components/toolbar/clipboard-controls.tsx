import * as React from 'react';
import { CopyIcon, ScissorsIcon, ClipboardPasteIcon, Trash2Icon } from 'lucide-react';
import { t } from '../../lib/i18n.js';
import { Button } from '../ui/button.js';
import { cn } from '../../lib/utils.js';

interface ClipboardControlsProps {
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
}

function ClipboardControls({
  onCopy,
  onCut,
  onPaste,
  onClear,
  disabled,
  className,
}: ClipboardControlsProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {onCopy !== undefined && (
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={t('flux.common.copy')}
          onClick={onCopy}
        >
          <CopyIcon />
        </Button>
      )}
      {onCut !== undefined && (
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={t('flux.common.cut')}
          onClick={onCut}
        >
          <ScissorsIcon />
        </Button>
      )}
      {onPaste !== undefined && (
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={t('flux.common.paste')}
          onClick={onPaste}
        >
          <ClipboardPasteIcon />
        </Button>
      )}
      {onClear !== undefined && (
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={t('flux.common.clear')}
          onClick={onClear}
        >
          <Trash2Icon />
        </Button>
      )}
    </div>
  );
}

export { ClipboardControls, type ClipboardControlsProps };
