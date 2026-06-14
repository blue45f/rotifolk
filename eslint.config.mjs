import { base, react, boundaries, defineConfig } from '@heejun/eslint-config'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.vercel/**',
    '**/*.d.ts',
    '**/*.tsbuildinfo',
    'apps/api/prisma/migrations/**',
    '**/*.config.{js,mjs,cjs,ts}',
  ]),

  // 공유 베이스(TS recommended + import 위생 + prettier 충돌 비활성).
  base({ files: ['**/*.{ts,tsx}'] }),

  // 공유 base 에 없는 기존 품질 규칙을 그대로 유지(하드 게이트).
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'prefer-const': 'error',
      'no-useless-assignment': 'error',
      'no-useless-escape': 'error',
    },
  },

  // apps/web — React 19 + Vite + React Compiler + jsx-a11y (browser).
  react({ files: ['apps/web/**/*.{ts,tsx}'] }),

  // apps/web 레포 정책: 네이티브 confirm/alert/prompt 금지 + hooks 불변식 강제.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      // 네이티브 window.confirm/alert/prompt 금지 — 브랜드 ConfirmProvider/Toast/Sheet를 쓴다.
      // (useConfirm() 같은 로컬 confirm 변수는 섀도잉이라 영향 없음)
      'no-restricted-globals': [
        'error',
        {
          name: 'confirm',
          message: 'useConfirm()/ConfirmProvider를 사용하세요 (window.confirm 금지).',
        },
        { name: 'alert', message: 'Toast/Sheet를 사용하세요 (window.alert 금지).' },
        { name: 'prompt', message: '입력 Sheet/폼을 사용하세요 (window.prompt 금지).' },
      ],
      // react-hooks 불변식과 exhaustive-deps 는 하드 게이트로 error 강제.
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      // 중첩 라벨(라벨이 컨트롤을 감싸는 패턴)의 보이는 텍스트가 span/strong 안에
      // 들어가 기본 depth 2 로는 탐지되지 않는다. 컨트롤은 정상 연결돼 있으므로 depth 만 올린다.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
      // autoFocus 는 방금 열린 표면의 주 컨트롤로 포커스를 옮길 때만 쓴다 —
      // 모달 Sheet/오버레이, 토글로 펼쳐지는 인라인 편집, 검색이 곧 목적인 /search 페이지.
      // 모두 올바른 모달/오버레이 포커스 동작이라 의도적으로 허용한다.
      'jsx-a11y/no-autofocus': 'off',
    },
  },

  // apps/web 계층 경계 — app/domains/shared/infrastructure 4계층.
  // features/→domains/, services/→infrastructure/ 로 물리 이동했고,
  // components/hooks/store/styles/mocks/test 는 옮기지 않고 shared 로 매핑한다.
  // 단, components/layout(헤더·바텀내비·푸터·루트레이아웃)과 feedback/PwaInstallBanner 는
  // 알림·채팅·i18n·커맨드팔레트·pwa 도메인을 오케스트레이션하는 앱셸 컴포넌트라
  // (Aperitivo 리디자인 셸 포함) app 계층으로 매핑한다. element 순서상 shared 보다
  // 먼저 와야 우선 매칭된다.
  ...boundaries({
    files: ['apps/web/src/**/*.{ts,tsx}'],
    elements: [
      { type: 'app', pattern: 'apps/web/src/{app,router,pages}/**/*', mode: 'full' },
      { type: 'app', pattern: 'apps/web/src/components/layout/**/*', mode: 'full' },
      {
        type: 'app',
        pattern: 'apps/web/src/components/feedback/PwaInstallBanner.tsx',
        mode: 'full',
      },
      { type: 'domains', pattern: 'apps/web/src/domains/*/**/*', mode: 'full' },
      {
        type: 'shared',
        pattern: 'apps/web/src/{components,hooks,store,styles,mocks,test}/**/*',
        mode: 'full',
      },
      { type: 'infrastructure', pattern: 'apps/web/src/infrastructure/**/*', mode: 'full' },
    ],
    rules: [
      { from: ['app'], allow: ['app', 'domains', 'shared', 'infrastructure'] },
      { from: ['domains'], allow: ['domains', 'shared', 'infrastructure'] },
      { from: ['infrastructure'], allow: ['shared', 'infrastructure'] },
      { from: ['shared'], allow: ['shared'] },
    ],
  }),
  // boundaries 는 TS 임포트를 분류하려면 리졸버가 필요하다(없으면 조용히 no-op).
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    settings: {
      'import/resolver': { typescript: { project: 'apps/web/tsconfig.json' }, node: true },
    },
  },
  // 기술부채 완화(차기 패스에서 분리 예정): infrastructure/api.ts 는 인증 만료 시
  // live 도메인의 소켓을 끊는 부수효과가 자연스러워 domains/live/socket 을 직접
  // import 한다(infrastructure→domains). 소켓 수명주기를 별도 계층으로 빼는 것은
  // 후속 작업으로 남긴다. infrastructure 의 다른 import 는 strict 를 유지한다.
  {
    files: ['apps/web/src/infrastructure/api.ts'],
    rules: { 'boundaries/element-types': 'off' },
  },

  // apps/api — NestJS (Node). 데코레이터 + 빈 생성자/클래스 관용.
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  // packages/shared — isomorphic (Node).
  {
    files: ['packages/shared/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // 테스트 — Vitest globals; fast-refresh 제약 완화.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  }
)
