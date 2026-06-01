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

## PR 체크 (기본)

- 변경사항 요약(도메인, 성능 영향, UX 영향)
- 테스트 결과 또는 재현 절차 (실패 시 실패 재현 명령 포함)
- API 계약 변경 여부와 프론트/백 계약 동기화 여부
- 데모/회귀 체크 항목(로컬 또는 시나리오 기반)

## 배포 전 검증

1. `pnpm run verify` 통과
2. 핵심 화면에 대한 회귀 체크
3. 마이그레이션/환경변수 영향 검토
4. PR 템플릿 요구 항목(영향 범위, 증거, 롤백 포인트) 충족
