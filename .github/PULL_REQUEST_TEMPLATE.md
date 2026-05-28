<!-- 제목은 Conventional Commits 규칙을 따릅니다. 예: feat(web): add host profile filters -->

## 변경 사항 요약

<!-- 무엇을, 왜 바꿨는지 1~3줄 -->

## 변경 종류

- [ ] feat
- [ ] fix
- [ ] docs
- [ ] refactor
- [ ] test
- [ ] chore

## 영향 범위

- [ ] apps/api
- [ ] apps/web
- [ ] packages/shared
- [ ] 루트 인프라(CI, scripts, config)
- [ ] 문서

## 체크리스트

- [ ] `pnpm run verify` 통과
- [ ] DB schema 변경 시 Prisma generate/push/seed 영향 확인
- [ ] API 계약 변경 시 shared 타입 갱신
- [ ] 사용자 흐름 변경 시 테스트 또는 수동 확인 기록

## 스크린샷 / 데모

<!-- UI 변경 시 첨부 -->
