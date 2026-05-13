export interface FluxDemoSchemaSection {
  id: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface FluxDemoSchemaStat {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export interface FluxDemoSchemaAction {
  id: string;
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export interface FluxDemoSchema {
  title: string;
  eyebrow: string;
  summary: string;
  schemaPath: string;
  stats: FluxDemoSchemaStat[];
  sections: FluxDemoSchemaSection[];
  actions: FluxDemoSchemaAction[];
}

export const testFluxSchema: FluxDemoSchema = {
  title: 'Flux Demo',
  eyebrow: 'Mock Runtime',
  summary:
    'This page is served by the mock menu + mock schema path flow and verifies that the Flux runtime is only requested when a Flux route is opened.',
  schemaPath: 'mock://flux-demo',
  stats: [
    {
      id: 'renderer',
      label: 'Renderer',
      value: 'Flux mock card',
      hint: 'Rendered by the dedicated Flux route chunk.',
    },
    {
      id: 'source',
      label: 'Source',
      value: 'apps/main/src/flux/testSchema.ts',
      hint: 'Loaded from a mock provider instead of the AMIS page provider.',
    },
    {
      id: 'loading',
      label: 'Lazy loading',
      value: 'On demand',
      hint: 'The shell should not fetch Flux runtime assets before this route is visited.',
    },
  ],
  sections: [
    {
      id: 'checklist',
      title: 'Runtime checklist',
      description: 'Use this block to validate the route split and mock provider path.',
      bullets: [
        'Menu item declares pageType=flux and schemaPath=mock://flux-demo.',
        'RouteRenderer lazy-loads the Flux runtime only after navigation.',
        'FluxRouteRenderer fetches the seeded schema from the Flux provider.',
      ],
    },
    {
      id: 'boundary',
      title: 'Bundle boundary',
      description: 'This sample exists to make the lazy boundary measurable in build output and E2E checks.',
      bullets: [
        'No AMIS dependency is required to render this page.',
        'No Flux route chunk should be downloaded during shell bootstrap.',
        'The route content should remain available in mock mode without backend schema APIs.',
      ],
    },
  ],
  actions: [
    {
      id: 'open-amis',
      label: 'Open AMIS Preview',
      href: '/amis/preview',
      variant: 'primary',
    },
    {
      id: 'open-dashboard',
      label: 'Back to Dashboard',
      href: '/dashboard',
      variant: 'secondary',
    },
  ],
};
