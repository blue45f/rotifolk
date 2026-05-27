# @rotifolk/shared

웹/서버가 공유하는 **도메인 타입 · Zod 스키마 · 매칭 알고리즘 · WebSocket 이벤트 명세**.

```
src/
├─ domain/       비즈니스 엔티티 타입 (User, Party, Round, Pair, Order, …)
├─ schema/       Zod 스키마 (DTO 검증 — 서버/클라이언트 동시 사용)
├─ matching/     라운드 로빈 / 트리오 로테이션 / 최종 매칭 알고리즘
└─ events/       Socket.IO event 명세 (ClientToServerEvents / ServerToClientEvents)
```

소비자는 import-only — 빌드 결과가 없고, TS 소스를 직접 참조합니다.

```ts
import type { Party, Round } from '@rotifolk/shared'
import { buildRoundRobin, findMutualMatches } from '@rotifolk/shared/matching'
import { CreatePartySchema } from '@rotifolk/shared/schema'
import { PARTY_ROOM } from '@rotifolk/shared/events'
```
