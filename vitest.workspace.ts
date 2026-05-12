import { defineWorkspace } from 'vitest/config';

const workspaceProjects = [
  'packages/*/vitest.config.ts',
  'apps/*/vitest.config.ts',
  'examples/*/vitest.config.ts',
  'flux-lib/*/vitest.config.ts',
];

export default typeof defineWorkspace === 'function'
  ? defineWorkspace(workspaceProjects)
  : workspaceProjects;
