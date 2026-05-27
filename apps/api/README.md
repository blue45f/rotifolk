# @rotifolk/api

NestJS 11 + Prisma + Socket.IO 기반 Rotifolk 백엔드.

## 실행

```bash
cp .env.example .env       # JWT_SECRET 등 채우기
pnpm prisma:generate
pnpm prisma:push           # SQLite로 즉시 부트
pnpm seed                  # 카테고리·장소·예시 파티 시드
pnpm dev
```

## 모듈 구성

- `auth` — JWT(local strategy). 회원가입/로그인/내정보.
- `users` — 프로필, 호스트 전환.
- `avatars` — 무드 기반 아바타 생성/조회.
- `venues` — 장소 디렉터리(제휴 + 사용자 등록), 예약 요청.
- `parties` — 파티 CRUD, 신청/취소/체크인.
- `matching` — 라운드 로빈/트리오/셔플 알고리즘으로 라운드 페어 생성, 중간/최종 매칭 투표.
- `quiz` — 호스트 라이브 퀴즈, 채점, 리더보드.
- `question-cards` — 글로벌 + 파티별 질문 카드 풀, 페어별 카드 드로우.
- `orders` — 음료/안주 라이브 주문, 호스트 처리.
- `live` — Socket.IO Gateway. 라운드 타이머, 이벤트 푸시, 모든 실시간 채널.

## Prisma 모델

`prisma/schema.prisma` 참고. dev 기본은 SQLite, 운영은 PostgreSQL.
