# Rotifolk Development Guide

## 시작 체크리스트

- `pnpm install`
- 루트 README의 시나리오(데모 계정/환경 변수) 확인
- `apps/api/.env.example`의 `MIN_HOST_PAYOUT_PERCENT`(호스트 수익 하한값) 값 확인
- `pnpm dev` 또는 `pnpm dev:web` + `pnpm dev:api`로 로컬 동작
- 기능 변경 시 `packages/shared` 타입 계약부터 갱신

## 의무 스크립트

```bash
pnpm install                    # 의존성 설치
pnpm dev                        # web + api 동시 실행
pnpm dev:mock                   # API 없이 MSW 모드 실행
pnpm typecheck                  # 전체 타입 체크
pnpm test                       # 전체 테스트
pnpm test:api-contracts         # API 계약 감사 로직 단위 테스트
pnpm test:frontend-a11y         # 정적 접근성 감사 로직 단위 테스트
pnpm audit:api-contracts        # Web API 호출 ↔ API/MSW 라우트 계약 감사
pnpm audit:frontend-a11y        # 클릭 가능한 비시맨틱 요소 정적 접근성 감사
pnpm lint                       # 코드 린트
pnpm build                      # 전체 빌드
pnpm verify                     # 구조 + CI 검증 합성 게이트
pnpm validate:architecture      # 아키텍처/문서/스크립트 최소 규칙 검증
```

## 아키텍처 변경 규칙

1. 계약 우선 원칙
   - 공통 타입/스키마 변경은 `packages/shared`로 시작합니다.
2. 경계 이동
   - UI 로직을 API로 내려보내지 않습니다.
   - 비즈니스 규칙은 반드시 API에서 계산됩니다.
3. 실시간 이벤트
   - Socket 이벤트 이름/페이로드 변경 시 API와 Web 양측에서 계약 테스트 범위를 갱신합니다.
4. API 호출 계약
   - Web에서 `api.get/post/patch/delete` 호출을 추가하거나 변경하면 실제 Nest 라우트와 MSW 핸들러를 함께 갱신합니다.
   - `pnpm audit:api-contracts`가 통과해야 목 모드와 실제 API 모드의 동작 차이가 생기지 않습니다.
5. 접근성 회귀 방지
   - 클릭 가능한 UI는 `button`, `a`, `Link` 같은 시맨틱 요소를 우선 사용합니다.
   - `pnpm audit:frontend-a11y`가 통과해야 키보드/스크린리더 접근성 회귀를 줄일 수 있습니다.
6. 시드/DB 변경
   - `pnpm db:generate`, `pnpm db:push`, `pnpm seed` 순으로 진행 후 검증을 남깁니다.
7. 테마 / 다크 모드 (FOUC 방지)
   - 색은 모두 `src/styles/tokens.css`의 디자인 토큰으로 흐릅니다. 다크는
     `:root[data-theme='dark']`(명시 선택) + `@media (prefers-color-scheme: dark)`의
     `:root:not([data-theme='light'])`(시스템 폴백, 라이트 고정 존중)에서 명도만 반전하고
     hue는 유지합니다. 새 색은 raw 값이 아니라 토큰으로 추가하세요.
   - 첫 페인트 전 `index.html`의 인라인 스크립트가 `localStorage['rotifolk-theme']`
     (zustand persist 형태 `{ state: { theme } }`)을 읽거나 `prefers-color-scheme`로
     폴백해 `document.documentElement.dataset.theme`를 설정합니다 → 다크/시스템 사용자도
     라이트 플래시(FOUC)가 없습니다.
   - 이 인라인 스크립트의 분기 로직은 `src/store/themeStore.ts`의 순수 함수
     `resolveTheme(theme, prefersDark)`와 **반드시 동일**해야 합니다. 어느 한쪽을 바꾸면
     `src/store/themeStore.test.ts`가 둘의 정합성(저장 키 `THEME_STORAGE_KEY` 포함)을
     잠가두니 함께 갱신하세요. 런타임 적용은 `useApplyTheme()`가 담당합니다.
   - 토글은 헤더의 접근성 버튼(`aria-label`, 해/달 글리프, i18n `btn.dark`/`btn.light`,
     localStorage 영속)입니다.

## PR 체크 (기본)

- 변경사항 요약(도메인, 성능 영향, UX 영향)
- 테스트 결과 또는 재현 절차 (실패 시 실패 재현 명령 포함)
- API 계약 변경 여부와 프론트/백 계약 동기화 여부
- 데모/회귀 체크 항목(로컬 또는 시나리오 기반)

## 테스트

- **단위/계약 테스트는 vitest**(`pnpm test`, 패키지별 `vitest run`)로 돌립니다.
- `apps/api`는 `vitest.config.ts`에서 `@/`·`@rotifolk/shared` 별칭을 해석하므로,
  서비스 레벨 테스트에서 이 별칭을 쓰는 모듈을 그대로 import 할 수 있습니다.
  (Prisma는 목으로 대체, argon2/JWT/매퍼는 실제 실행하는 패턴을 권장)
- **인증 임계 경로**는 `apps/api/src/modules/auth/auth.service.spec.ts`로 다음
  보안 불변식을 잠가둡니다 — 변경 시 이 테스트를 함께 갱신하세요.
  - 비밀번호는 argon2로 해시되며 평문이 저장/응답에 절대 노출되지 않음
  - 발급되는 user 객체에 `passwordHash`가 새지 않음(`toPublicUser` 경유)
  - 중복 이메일은 `email_taken`으로 거부
  - 로그인은 "이메일 존재 여부"를 드러내지 않음(미존재·오답 모두 동일한
    `invalid_credentials` → 계정 열거 방지)
- 비즈니스 규칙 변경은 `packages/shared`의 도메인 테스트부터 갱신합니다.

## 배포 전 검증

1. `pnpm run verify` 통과
2. 핵심 화면에 대한 회귀 체크
3. 마이그레이션/환경변수 영향 검토
4. PR 템플릿 요구 항목(영향 범위, 증거, 롤백 포인트) 충족
5. 배포 구조·시크릿·대시보드 작업은 `docs/DEPLOYMENT.md` 참고
   (FE=Vercel, BE=EC2 Docker, DB=Neon Postgres)
