# @nop-chaos/e2e-shared

Cross-project E2E test infrastructure for Nop platform.

## Usage

```typescript
import { test, getEngine, CrudListPage, GraphQLClient } from '@nop-chaos/e2e-shared';

// Use custom fixture with engine injection
test('my test', async ({ page, engine }) => {
  const crudPage = new CrudListPage(page, engine, {
    entityRoute: 'NopAuthUser',
    columnHeaders: ['username', 'email'],
  });
  await crudPage.navigate();
  // ...
});
```

See `docs/design/e2e-shared-infrastructure.md` for full API reference.
