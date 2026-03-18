import { Blocks, Compass, Palette } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'

const highlights = [
  {
    title: 'Shared tokens',
    description: 'Uses the host theme tokens so colors and surfaces automatically follow the active shell theme.',
    icon: <Palette className='size-4' />
  },
  {
    title: 'Tailwind preset',
    description: 'Compiles its own utility classes with the shared preset instead of depending on the host build output.',
    icon: <Blocks className='size-4' />
  },
  {
    title: 'Builtin registration',
    description: 'Registers a React component directly into the host builtin page registry through the contribution loader.',
    icon: <Compass className='size-4' />
  }
]

export function ContributionBuiltinPage() {
  return (
    <div className='space-y-6'>
      <Card className='theme-card overflow-hidden border-none contribution-hero'>
        <CardHeader className='space-y-3'>
          <div className='eyebrow-text tracking-[0.22em]'>Contribution Builtin Page</div>
          <CardTitle className='text-3xl'>Tailwind shared with the host shell</CardTitle>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            This page is compiled inside the contribution project, but it reuses the host theme tokens, UI base styles,
            and Tailwind preset. The host only needs to inject the contribution CSS and register the component.
          </p>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-3'>
          {highlights.map((item) => (
            <div key={item.title} className='contribution-kpi-panel'>
              <div className='flex items-center justify-between gap-3 text-muted-foreground'>
                <span>{item.title}</span>
                {item.icon}
              </div>
              <p className='mt-4 text-sm leading-6 text-foreground/85'>{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card className='theme-card border-none'>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm text-muted-foreground'>
            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>
              The contribution registers this page as a builtin component using `componentId: contribution-harbor-page`.
            </div>
            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>
              The contribution also provides a menu item with `pageType: builtin`, so routing stays inside the host shell.
            </div>
            <div className='rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4'>
              Tailwind classes like `bg-background`, `text-foreground`, and `shadow-primary` come from the shared preset.
            </div>
          </CardContent>
        </Card>

        <Card className='theme-card border-none'>
          <CardHeader>
            <CardTitle>Shared stack</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-muted-foreground'>
            {[
              'Host loads @nop-chaos/theme-tokens/styles.css',
              'Contribution compiles component-page.css with @nop-chaos/tailwind-preset',
              'Contribution imports @nop-chaos/ui/base.css for shared semantic styles',
              'Host injects contribution styles and registers the component'
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
