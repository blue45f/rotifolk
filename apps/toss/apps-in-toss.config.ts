import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'rotifolk',
  brand: {
    primaryColor: '#D6788F',
  },
  permissions: [
    { name: 'clipboard', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  webView: {},
  webBundleDir: 'dist',
  navigationBar: { withBackButton: true, withHomeButton: true },
})
