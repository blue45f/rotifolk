import { defineConfig } from '@apps-in-toss/web-framework/config'

// 취향 기반 소셜 로테이션 모임. 비게임=partner. 주류 포함 모임은 19+ 표기.
export default defineConfig({
  appName: 'rotifolk',
  brand: { displayName: '로티포크', primaryColor: '#D6788F', icon: '' },
  web: { host: 'localhost', port: 5186, commands: { dev: 'vite', build: 'vite build' } },
  permissions: [
    { name: 'clipboard', access: 'read' },
    { name: 'clipboard', access: 'write' },
  ],
  outdir: 'dist',
  webViewProps: { type: 'partner' },
  navigationBar: { withBackButton: true, withHomeButton: true },
})
