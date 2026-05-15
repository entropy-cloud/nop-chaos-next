import { cn } from '../../lib/utils.js';
import { Loader2Icon } from 'lucide-react';
import { t } from '../../lib/i18n.js';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      role="status"
      aria-label={t('flux.common.loading')}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
