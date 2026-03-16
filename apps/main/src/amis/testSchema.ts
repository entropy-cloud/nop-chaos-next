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
      type: 'tpl',
      className: 'text-muted',
      tpl: 'This page is intentionally static and is used only to verify the first integration milestone.'
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
