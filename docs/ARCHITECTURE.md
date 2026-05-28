# Rotifolk Architecture

## Architecture 목표

Rotifolk는 `apps/`와 `packages/`로 분리된 pnpm workspace 기반의 소셜 이벤트 플랫폼입니다.
핵심 원칙은 다음입니다.

- 도메인 책임을 `apps/web`, `apps/api`, `packages/shared`로 분리한다.
- 실시간 이벤트(라운드/매칭/알림)는 API 계층에서 생성하고, UI는 이벤트 소비만 담당한다.
- 타입/스키마는 `packages/shared`를 단일 원천(Single Source of Truth)으로 관리한다.
- 모니터링·로그·배포 증적을 남겨, 운영 단계에서 증적 기반 판단이 가능하도록 한다.

## 레이어 구조

```text
rotifolk/
├─ apps/
│  ├─ web/    # React 19 + Vite 8 + TS, 사용자 화면
│  └─ api/    # NestJS 11, Prisma, Socket.IO, 인증/비즈니스 규칙
└─ packages/
   └─ shared/ # 공통 타입, Zod 스키마, 매칭 도메인 유틸
```

## 계층 경계

- `apps/web`
  - 화면/라우팅/상태관리(UI/Server state)는 여기서 담당.
  - API 호출은 계약 기반(`packages/shared` 타입 + API 응답)를 우선 따릅니다.
  - MSW mock 모드(`pnpm dev:mock`)는 계약 우선 테스트와 UI 동작 검증에 사용합니다.

- `apps/api`
  - 사용자 인증, 파티/라운드/매칭, 주문, 채팅/신고/제재 API를 담당합니다.
  - Socket.IO 이벤트는 `apps/api`에서 발행/구독 계약을 정의하고 `apps/web`은 이 계약을 렌더링에만 사용합니다.

- `packages/shared`
  - 공통 도메인 타입, Zod 스키마, 매칭 규칙 로직을 공유합니다.
  - 패키지 간 직렬화 규칙과 필드 계약 변경은 문서화하고 마이그레이션 가이드를 남겨야 합니다.

## 기술 스택

- Frontend: React 19, React Router 7, Zustand, TanStack Query, React Hook Form, MSW
- Backend: NestJS 11(Fastify), Prisma, PostgreSQL, Socket.IO, Passport/JWT
- 플랫폼: pnpm workspace, Node.js, GitHub Actions, Husky + commitlint

## 실행/배포 흐름

- `pnpm install`: 모노레포 의존성 설치
- `pnpm dev` 또는 `pnpm dev:web` + `pnpm dev:api`: 로컬 동시 실행
- `pnpm dev:mock`: 웹만 실행하고 백엔드 의존성을 배제한 상태에서 UI 계약 확인
- `pnpm seed`: 핵심 시드 데이터 적재

## 데이터/경계 규칙

1. 비즈니스 규칙(매칭/블록/파트너 선택)은 API에서 유일하게 계산한다.
2. UI는 상태 표시와 입력 유효성 제어, 서버 오류 표시를 담당한다.
3. 스키마 변경은 `packages/shared` → `apps/api` → `apps/web` 순으로 동기화한다.
4. 실시간 이벤트 스키마 변경 시 소비 측 이벤트 핸들러와 테스트를 먼저 업데이트한다.

## 품질 게이트

`pnpm run verify`는 아래 순서를 통과해야 합니다.

1. `pnpm run validate:architecture` (폴더/문서/핵심 스크립트 존재성)
2. `pnpm run ci` (typecheck, test, build)

로컬 검증은 아래 문서로 보완합니다.

- [docs/DEVELOPMENT.md](./DEVELOPMENT.md)
- [README.md](../README.md)
