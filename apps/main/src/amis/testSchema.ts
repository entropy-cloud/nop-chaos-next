export const testAmisSchema = {
  type: 'page',
  title: 'Amis Preview',
  body: [
    {
      type: 'alert',
      level: 'success',
      body: 'Static amis schema is rendering inside the current React shell.'
    },
    {
      type: 'grid',
      columns: [
        {
          md: 6,
          body: {
            type: 'panel',
            title: 'Runtime checklist',
            body: {
              type: 'tpl',
              tpl: '<ul><li>React shell mounted</li><li>Route type amis resolved</li><li>Static schema loaded from provider</li></ul>'
            }
          }
        },
        {
          md: 6,
          body: {
            type: 'panel',
            title: 'Phase 1 scope',
            body: {
              type: 'tpl',
              tpl: '<ul><li>Minimal adapter</li><li>xui:roles transform</li><li>Menu and route integration</li></ul>'
            }
          }
        }
      ]
    },
    {
      'xui:component': 'host.page-section',
      title: 'xui:component validation',
      description: 'This block is transformed by the host xui component registry before amis renders the final schema.',
      body: {
        type: 'grid',
        columns: [
          {
            md: 6,
            body: {
              type: 'tpl',
              tpl: '<ul><li>xui:component resolved</li><li>host transform applied</li><li>children continue through schema processing</li></ul>'
            }
          },
          {
            md: 6,
            body: {
              type: 'alert',
              level: 'info',
              body: 'Use this section to verify the React host can register Nop-style schema transforms.'
            }
          }
        ]
      }
    },
    {
      type: 'tpl',
      className: 'text-[hsl(var(--muted-foreground))]',
      tpl: 'This page is intentionally static and is used only to verify the first integration milestone.'
    },
    {
      'xui:import': '/mock/preview.lib.js',
      type: 'panel',
      title: 'xui:import and action scope validation',
      body: [
        {
          type: 'tpl',
          tpl: '<ul><li>@action resolves imported module functions</li><li>Imported modules can call host actions</li><li>@fn keeps the original source for schema serialization</li></ul>'
        },
        {
          type: 'button-toolbar',
          buttons: [
            {
              type: 'button',
              label: 'Run imported @action',
              level: 'primary',
              actionType: 'ajax',
              api: '@action:preview.toast'
            },
            {
              type: 'button',
              label: 'Imported navigation action',
              level: 'default',
              actionType: 'ajax',
              api: '@action:preview.navigatePlugins'
            }
          ]
        }
      ]
    },
    {
      type: 'button-group',
      buttons: [
        {
          type: 'button',
          label: 'Trigger host toast',
          level: 'primary',
          onClick: '@fn:(event, props) => page.getAction(\'preview.notify\')?.(event, props)'
        },
        {
          type: 'button',
          label: 'Go to plugins',
          level: 'default',
          onClick: '@fn:(event, props) => page.getAction(\'preview.navigatePlugins\')?.(event, props)'
        }
      ]
    }
  ]
} as const
