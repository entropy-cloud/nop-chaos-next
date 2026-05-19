import { useSyncExternalStore } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { getConfirmRequest, resolveConfirm, subscribeConfirm } from '../../services/confirm';

export function ConfirmDialogHost() {
  const { t } = useTranslation();
  const request = useSyncExternalStore(subscribeConfirm, getConfirmRequest, getConfirmRequest);

  if (!request) {
    return null;
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && resolveConfirm(false)}>
      <AlertDialogContent key={request.id}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {request.options.title ?? t('common.confirm', { defaultValue: 'Confirm' })}
          </AlertDialogTitle>
          <AlertDialogDescription>{request.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => resolveConfirm(false)}>
            {request.options.cancelText ?? t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={request.options.destructive ? 'destructive' : 'default'}
            onClick={() => resolveConfirm(true)}
          >
            {request.options.confirmText ?? t('common.confirm', { defaultValue: 'Confirm' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
