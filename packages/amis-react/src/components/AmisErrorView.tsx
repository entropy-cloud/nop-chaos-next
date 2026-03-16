import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'

interface AmisErrorViewProps {
  title: string
  message: string
}

export function AmisErrorView({ title, message }: AmisErrorViewProps) {
  return (
    <Card className="theme-card border-[hsl(var(--danger))]/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[hsl(var(--danger))]">
          <AlertCircle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{message}</CardContent>
    </Card>
  )
}
