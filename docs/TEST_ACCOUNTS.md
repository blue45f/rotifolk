# 테스트 계정(로컬 검증용)

- 목적: 수익 정책/관리자 기능 검증
- 저장 위치: `apps/api/prisma/seed.ts` 및 README 데모 계정 표

## 계정 목록

| 역할        | 이메일                                                                        | 비밀번호        |
| ----------- | ----------------------------------------------------------------------------- | --------------- |
| admin       | `admin@rotifolk.dev`                                                          | `rotifolk1234!` |
| host        | `host@rotifolk.dev`                                                           | `rotifolk1234!` |
| participant | `w1@rotifolk.dev` ~ `w5@rotifolk.dev` / `m1@rotifolk.dev` ~ `m5@rotifolk.dev` | `rotifolk1234!` |

## 반영/검증 가이드

1. DB 스키마 동기화
   - `pnpm db:push`
2. 테스트 계정 재생성
   - `pnpm seed`
3. 백엔드 실행
   - `pnpm dev:api`
4. 관리자 로그인 확인
   - `POST http://localhost:3000/auth/login` with `{"email":"admin@rotifolk.dev","password":"rotifolk1234!"}`

## 권장 점검 항목

- `GET /payments/admin/summary` (200)
- `GET /payments/admin/revenue-rules` (200)
- `GET /payments/admin/revenue-rules/history` (200)
- `PATCH /payments/admin/revenue-rules` (변경 사유 포함, 최소 호스트 정산율 포함)
- `POST /payments/admin/revenue-rules/rollback`
- `PATCH` 요청 예시: `{"platformFeePercent":12,"refundRetentionPercent":2,"minimumHostPayoutPercent":87,"reason":"수익률 재조정"}`

## 최근 로컬 검증 결과 (2026-06-02)

- `admin@rotifolk.dev` 로그인 응답: `token` 발급 성공, `role=admin` 확인
- 호스트 계정(`host@rotifolk.dev`)으로 `/api/payments/admin/revenue-rules` 호출 시 `403 admin_only` 확인
- `/api/payments/admin/summary` 호출 시 정상 200 응답
- 규칙 변경(8/0 → 10/15, 사유: `요율 테스트`) 성공
- 최소 호스트 정산율 변경(85% → 87%, 사유: `호스트 수익 바닥 보전`) 성공
- 변경 이력 조회 시 `reason: 요율 테스트` 항목 확인
- 롤백(`historyId` 지정, 사유: `테스트 롤백`) 호출 시 규칙이 이전값(8/0)으로 복귀
- 요약(summary) 호출에서 `minimumHostPayoutPercent: 87` 노출 확인
