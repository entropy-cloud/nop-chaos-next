import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function getOnlineState() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(getOnlineState);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="border-b border-[hsl(var(--warning))] bg-[hsl(var(--warning-bg))] px-4 py-2 text-sm text-[hsl(var(--warning))]"
      role="status"
    >
      {t('common.offline')}
    </div>
  );
}
