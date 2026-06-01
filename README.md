# 🍷 Rotifolk

> 로테이션 파티 매칭 플랫폼 — 와인, 커피, 차, 위스키. 모르는 사람들이 진짜 친해지는 5분 라운드.

Rotifolk는 문토·프립의 소셜링 모임을 한 단계 발전시킨 **로테이션 매칭** 전용 앱입니다.
파티가 시작되면 자동으로 4~5분 라운드마다 자리를 바꾸며 모든 참가자와 1:1/소그룹 매칭을 경험하고, 마지막엔 가장 마음 맞는 사람을 **최종 매칭**으로 연결합니다.

## ✨ 핵심 기능

### 호스트 (모임장)

- 모임 카테고리 선택 — 와인 / 커피 / 차 / 위스키 / 칵테일 / 커스텀
- **장소 섭외 스튜디오** — 카테고리·인원·시간·**내 위치**를 입력하면 적합도(Fit) 점수로 공간을 추천. 즉시예약(instantBook) 또는 섭외 요청, 투명 견적(시간×단가×주말·피크 배수−막판할인+청소비), 확정 후 도착 가이드 공개 — `offhours` 마켓플레이스 모델을 와인셀러 무드로 이식
- 모임 포맷 선택 — 로테이션 / 쪽지팅 / 믹서, 대화 구조 1:1 · N:1(핫시트) · N:N(그룹)
- 모집 규모·**비례 성비** 설정 + 마감 시각 미달 시 자동 취소 (참가 시 성비 자동 조절·대기열 자동 승급)
- 매칭 정책 — 상호매칭 / 상위 N명 / 전원, 연결 매체 채팅·전화, 종료 후 그룹 채팅
- 라운드 대화 도우미 — 질문·밸런스게임·운세·이상형 덱
- 파티 진행 컨트롤 패널 — 라운드 시작/정지, 이벤트 발사, 음료/안주 주문 현황
- 정산 / 후기 / 다음 모임 리마인드

### 사장님 (공간 주인)

- **공간 등록** — 위치·영업시간·휴무·정원·가격·메뉴·무드·도착 가이드를 한 번에
- **사장님 호스팅** — 마감 후·휴무일 등 *유휴 시간*을 원탭으로 파티로 전환 (정원·메뉴·가격 자동)
- 섭외 요청 인박스 — 다른 호스트의 대관 요청을 확정/거절

### 참여자

- 카테고리·지역·시간대로 파티 탐색
- 아바타 빌더 (실명 노출 X, 무드 표현)
- 라운드 시작 알림 — 다음 자리/파트너 안내
- 라이브 퀴즈 · 질문 카드 · 미니 이벤트
- "이 사람이 좋아요" — 중간 매칭 / 최종 매칭 투표
- 그 자리에서 음료·안주 추가 주문
- 파티 종료 후 상호 매칭된 사람과 채팅 오픈

## 🧱 아키텍처

```
rotifolk/                 (pnpm workspace)
├─ apps/
│  ├─ web/                React 19 + Vite 8 + TS  (react-scaffolding 베이스)
│  └─ api/                NestJS 11 + Prisma + Socket.IO + PostgreSQL
└─ packages/
   └─ shared/             도메인 타입 · Zod 스키마 · 매칭 알고리즘
```

### 프론트엔드 스택

- React 19 + Vite 8 + TypeScript
- React Router 7 (object-based, lazy routes)
- Zustand (UI 상태) + TanStack Query 5 (서버 상태)
- React Hook Form + Zod
- CSS Modules + 디자인 토큰
- Framer Motion (마이크로 인터랙션)
- Socket.IO Client

### 백엔드 스택

- NestJS 11 (Fastify adapter)
- Prisma ORM + PostgreSQL (SQLite fallback for dev)
- Socket.IO Gateway — 라운드 타이머/매칭/이벤트/주문 실시간
- JWT 인증 + Passport (Local + Kakao 준비)
- Class-validator + Zod 공유 스키마

## 🚀 시작하기

```bash
# 1. 설치
pnpm install

# 2. DB 준비 (SQLite 기본)
cp apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm db:push
pnpm seed          # 호스트·참가자·장소·파티·질문카드 시드

# 3. 동시 실행
pnpm dev           # web :5173 + api :3000 동시 실행
# 또는 따로:
# pnpm dev:web
# pnpm dev:api
```

### 데모 계정

| 역할   | 이메일                                | 비밀번호        |
| ------ | ------------------------------------- | --------------- |
| 관리자 | `admin@rotifolk.dev`                  | `rotifolk1234!` |
| 호스트 | `host@rotifolk.dev`                   | `rotifolk1234!` |
| 참가자 | `p1@rotifolk.dev` ~ `p7@rotifolk.dev` | `rotifolk1234!` |

### 시나리오

1. **호스트 창**: `host@rotifolk.dev`로 로그인 → 호스트 콘솔 → 한남 와인 5:5 파티 → "라운드 짜기" → "▶ 파티 시작"
2. **참가자 창**: `w1@rotifolk.dev` 또는 `m1@rotifolk.dev`로 로그인 → 같은 파티 → "🔴 라이브 입장"
3. 라운드 시작 시 양쪽 모두 파트너·좌석이 표시 (5:5 이성 매칭 자동).
4. "🍷 음료/안주 추가" — 무제한 파티는 0원, 잔당 결제 파티는 합산.
5. 마지막 라운드 후 호스트가 "🌹 파티 종료" → 최종 매칭 공개 + 매칭 페어 1:1 채팅방 자동 생성 (`/chats`).

### 🧪 백엔드 없이 mock 모드로 실행

```bash
pnpm dev:mock        # web만 :5173, MSW로 /api/* 인터셉트
```

`VITE_USE_MSW=true` 가 켜지면 `apps/web/src/mocks/`가 모든 API 응답을 인메모리 데이터로 돌려줍니다 — `[MOCK]` 라벨로 식별 가능.

### ⚙️ 핵심 모델 요약

- **F&B 패키지**: `MenuItem.availability` = `paid | included | unlimited | course`. 무제한은 합계 제외, 코스는 호스트만 발주. `Party.drinkPackage/snackPackage`로 파티 가격 정책 표현.
- **이성 매칭**: `genderRatio==='5:5'` 이면 `buildHeteroRotation`이 우선 — cross-gender 페어 보장 회전 알고리즘.
- **자유 호스팅**: `User.role` 기본값 `host` — 누구나 모임 개설 가능.
- **안전 장치**: `UserBlock` 양방향 회피 — `/parties/:id/block-check`로 사전 알림.
- **엔빵 정산**: `/orders/party/:id/split?mode=equal|pay-yours` — 1/N 균등 또는 개인 주문 합산.
- **채팅**: 파티 단톡(`group`) + 매칭 페어 1:1(`pair`) 자동 개설.
- **신고/어드민**: `/admin/reports` — admin 권한 사용자만 처리.

## 📂 디렉터리

- `apps/web` — React 클라이언트 ([README](apps/web/README.md))
- `apps/api` — NestJS 서버 ([README](apps/api/README.md))
- `packages/shared` — 공유 타입/스키마/매칭 로직 ([README](packages/shared/README.md))

## ✅ 머지 게이트

`main` 브랜치는 다음 두 검사가 모두 통과해야 머지할 수 있어요:

1. **Typecheck · Test · Build** — GitHub Actions에서 lint/typecheck/test/build를 일괄 검증
2. **CodeRabbit** — AI 코드 리뷰가 결정적 이슈를 표시하지 않을 때만 통과

Force-push와 브랜치 삭제는 차단되며, squash-merge 후 feature 브랜치는 자동 삭제됩니다.

## ✅ PR 규칙

- PR 제목은 Conventional Commits 규칙을 따릅니다.
- PR 본문은 `.github/PULL_REQUEST_TEMPLATE.md`의 체크리스트와 함께 아래를 남깁니다.
  - 핵심 변경 요약 및 영향 범위
  - `pnpm run verify` 로그, 실패 시 재현 명령, 롤백 포인트
  - API 계약/데이터 마이그레이션/시각적 변경에 대한 검증 증거
- 동일 PR에서 필수 항목이 `skipped` 상태이면 병합을 보류하고 사유와 재실행 계획을 기록합니다.
- CodeRabbit이 활성화된 PR은 최신 head SHA 기준 `APPROVED`가 필요합니다.
- CodeRabbit이 없는 PR은 최소 1인 이상 사람 리뷰 승인 조건을 충족합니다.

## 📝 라이선스

Private — 2026 Rotifolk.
