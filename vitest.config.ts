import { defineConfig } from 'vitest/config'
import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Windows temporary installs can be reached through both RUNNER~1 and the
// long user path. The native resolver expands 8.3 names; realpathSync does
// not. Give Vite's node and jsdom environments the same native root.
const root = realpathSync.native(fileURLToPath(new URL('.', import.meta.url)))

export default defineConfig({
  root,
  resolve: {
    alias: {
      '@deepseek-ai/dsh-client-ui-renderer/client': join(root, 'tests/shims/runtime.client.ts'),
      // The published bundle imports host-only packages it does not declare;
      // specs see the exports the compat adapter reads instead.
      '@deepseek-ai/dsh-client-ui-primitives': join(root, 'tests/shims/ui-primitives.tsx'),
    },
  },
  test: {
    include: ['tests/**/*.{spec,test}.{ts,tsx}'],
    pool: 'forks',
    setupFiles: [join(root, 'tests/setup/module-loader.client.ts')],
    server: {
      deps: {
        inline: [/@deepseek-ai\/dsh-client-/],
      },
    },
  },
})
