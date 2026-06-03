import type { Preview } from '@storybook/react-vite'

// Pull in the full token + reset cascade so CSS Modules resolve their
// `var(--…)` references and components look identical to the running app.
// `global.css` itself `@import`s `tokens.css`, so this single import is enough.
import '../src/styles/global.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Surface violations in the a11y panel without failing the build; the
      // dedicated `audit:frontend-a11y` gate owns hard enforcement.
      test: 'todo',
    },
    backgrounds: {
      options: {
        cellar: { name: 'Cellar (app bg)', value: 'oklch(98.5% 0.008 80)' },
        surface: { name: 'Surface', value: 'oklch(100% 0 80)' },
        twilight: { name: 'Twilight (dark)', value: 'oklch(15% 0.025 290)' },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'cellar' },
  },
  // Mirror the app's no-FOUC theme bootstrap: stories render in light theme by
  // default. Toggle the docElement `data-theme` to preview dark surfaces.
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
      return Story()
    },
  ],
  globalTypes: {
    theme: {
      description: 'App theme (light / dark cellar)',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
}

export default preview
