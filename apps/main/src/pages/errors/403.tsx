import { AlertTriangle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getCurrentHomePath } from '../../config/homePath';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="theme-card max-w-xl text-center">
        <CardHeader className="items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[color-mix(in_hsl,hsl(var(--danger))_12%,transparent)] text-[hsl(var(--danger))]">
            <AlertTriangle className="size-8" />
          </div>
          <div className="eyebrow-text">403</div>
          <CardTitle>{t('errors.forbiddenTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{t('errors.forbiddenDescription')}</p>
          <Button onClick={() => navigate(getCurrentHomePath())}>{t('common.backHome')}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
