import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'

interface FluxRouteRendererProps {
  schemaPath: string
  title?: string
}

export function FluxRouteRenderer({ schemaPath, title }: FluxRouteRendererProps) {
  return (
    <Card className="theme-card">
      <CardHeader>
        <CardTitle>{title ?? 'Flux Page'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <p>Schema path: {schemaPath}</p>
          <p className="mt-2">Flux runtime integration coming soon.</p>
          <p className="mt-2">See migration plan: <a href="/docs/plans/amis-to-flux-migration.md" className="text-[hsl(var(--primary))] underline">AMIS to Flux Migration</a></p>
        </div>
      </CardContent>
    </Card>
  )
}
