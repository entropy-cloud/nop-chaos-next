import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'

const highlights = [
  {
    title: 'Host shared runtime',
    description: 'Host mode reuses the shell React, Router, UI, and shared runtime modules.'
  },
  {
    title: 'Contribution styles',
    description: 'This package ships its own shell and page CSS while still using host theme tokens.'
  },
  {
    title: 'Builtin registration',
    description: 'The contribution registers a builtin page so routing stays inside the host shell.'
  }
]

export function SalesOpsDemoPage() {
  return (
    <div className='space-y-6'>
      <Card className='theme-card overflow-hidden border-none contribution-hero'>
        <CardHeader className='space-y-3'>
          <div className='eyebrow-text tracking-[0.22em]'>Contribution Builtin Page</div>
          <CardTitle className='text-3xl'>Sales Ops Demo</CardTitle>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            This page is compiled inside the contribution project and exposed to the host through the contribution loader.
          </p>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-3'>
          {highlights.map((item) => (
            <div key={item.title} className='contribution-panel'>
              <div className='text-sm font-medium text-foreground'>{item.title}</div>
              <p className='mt-3 text-sm leading-6 text-muted-foreground'>{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card className='theme-card border-none'>
          <CardHeader>
            <CardTitle>Host integration contract</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm text-muted-foreground'>
            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>
              Component id: `sales-ops-demo-page`
            </div>
            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>
              Menu path: `/examples/sales-ops-demo`
            </div>
            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>
              Host mode loads shared runtime from the shell through fixed shim URLs.
            </div>
          </CardContent>
        </Card>

        <Card className='theme-card border-none'>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            {[
              'Update i18n resources for your domain text',
              'Replace placeholder theme and shell CSS',
              'Wire real builtin pages, menus, and setup logic'
            ].map((item) => (
              <div key={item} className='rounded-xl border border-dashed border-[hsl(var(--border))] px-4 py-3'>
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
