import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';

interface AmisLoadingViewProps {
  title: string;
}

export function AmisLoadingView({ title }: AmisLoadingViewProps) {
  return (
    <Card className="theme-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>Loading amis page...</CardContent>
    </Card>
  );
}
