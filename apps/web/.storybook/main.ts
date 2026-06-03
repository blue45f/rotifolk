import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook config for @rotifolk/web.
 *
 * Reuses the app's own `vite.config.ts` (via the @storybook/react-vite builder's
 * automatic merge) so CSS Modules, the `@/`…`@components/*` path aliases, and the
 * React Compiler / babel pipeline behave exactly as they do in the real app.
 * We intentionally strip dev-only `server`/`build` rollup tuning that has no
 * meaning inside Storybook, leaving plugins + aliases intact.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(viteConfig, {
      // Storybook supplies its own dev server / build; drop the app's proxy +
      // manualChunks tuning so they don't fight the builder.
      server: undefined,
      build: { sourcemap: false },
    })
  },
}

export default config
