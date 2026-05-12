import { Compass, LifeBuoy, MapPinned } from 'lucide-react';
import { getPluginBridge } from '@nop-chaos/plugin-bridge';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';

import harborMarkHref from '../harbor-mark.svg';

const quickLinks = [
  {
    title: 'Back to Harbor home',
    description:
      'Return to the extension dashboard page and continue browsing from the default Harbor workspace.',
    path: '/',
  },
  {
    title: 'Open Harbor page',
    description:
      'Jump directly to the extension builtin page registered by the Harbor demo package.',
    path: '/examples/extension-harbor',
  },
] as const;

function navigateTo(path: string) {
  const bridge = getPluginBridge();

  if (!bridge) {
    window.location.hash = `#${path}`;
    return;
  }

  bridge.navigate(path);
}

export function ExtensionNotFoundPage() {
  return (
    <div className="grid min-h-[74vh] place-items-center">
      <div className="w-full max-w-5xl space-y-6">
        <Card className="overflow-hidden rounded-[2rem] border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(236,253,245,0.92))] shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-6 pb-0">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-teal-200/70 bg-white/80 px-4 py-2 text-sm font-medium text-teal-700">
                  <Compass className="size-4" />
                  Harbor extension 404
                </div>
                <div className="space-y-3">
                  <div className="eyebrow-text tracking-[0.24em] text-teal-700">
                    System Page Override
                  </div>
                  <CardTitle className="max-w-3xl text-4xl leading-tight text-slate-950">
                    This route is not mapped inside the Harbor workspace.
                  </CardTitle>
                  <p className="max-w-3xl text-base leading-7 text-slate-600">
                    The host shell routed you to `/404`, but the rendered screen comes from the
                    extension package. This demonstrates a second system page override beyond login.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-[1.75rem] border border-white/70 bg-white/85 px-5 py-4 shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#0f766e,#155e75)] shadow-[0_18px_42px_rgba(15,118,110,0.28)]">
                  <img alt="Harbor" className="h-11 w-11 object-contain" src={harborMarkHref} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Active application</div>
                  <div className="text-2xl font-semibold text-slate-950">Harbor</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <MapPinned className="size-5 text-teal-700" />
                <span className="text-lg font-semibold">Suggested routes</span>
              </div>
              <div className="mt-5 grid gap-4">
                {quickLinks.map((item) => (
                  <button
                    key={item.path}
                    className="rounded-[1.25rem] border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-teal-300 hover:bg-teal-50/60"
                    onClick={() => navigateTo(item.path)}
                    type="button"
                  >
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{item.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-6 text-slate-50 shadow-sm">
              <div className="flex items-center gap-3">
                <LifeBuoy className="size-5 text-emerald-300" />
                <span className="text-lg font-semibold">Why this matters</span>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                <p>Login override proves that an extension can replace entry flows.</p>
                <p>
                  404 override proves that the host can keep route ownership while delegating system
                  views.
                </p>
                <p>
                  The same shell still handles auth state, menu loading, permissions, and plugin
                  runtime coordination.
                </p>
              </div>
              <Button
                className="mt-6 w-full justify-center bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={() => navigateTo('/')}
              >
                Return to Harbor workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
