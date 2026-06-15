import { base, react, defineConfig } from '@heejun/eslint-config'
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
      // 네이티브 globalThis.confirm/alert/prompt 금지 — 브랜드 ConfirmProvider/Toast/Sheet를 쓴다.
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
      // 모달 Sheet(CommandPalette/InvitePage/PartyDetail), 토글로 펼쳐지는 인라인
      // 편집/공지 작성(HostManage/HostProfile/LiveParty), 검색이 곧 목적인 /search 페이지.
      // 모두 올바른 모달/오버레이 포커스 동작이라 의도적으로 허용한다.
      'jsx-a11y/no-autofocus': 'off',
    },
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
