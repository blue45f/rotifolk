/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SOCKET_URL?: string
  readonly VITE_USE_MSW?: string
  // DeskCloud 네이티브 연동(@heejun/deskcloud SDK, pk_) — 각 *_URL 설정 시에만 활성.
  // *_PK 는 브라우저 노출이 안전한 공개 키이며 미설정 시 pk_demo 로 폴백한다(위젯 임베드 없음).
  readonly VITE_SURVEYDESK_URL?: string // 피드백(우하단 런처)
  readonly VITE_SURVEYDESK_PK?: string
  readonly VITE_CHANGELOGDESK_URL?: string // 새 소식(헤더 런처)
  readonly VITE_CHANGELOGDESK_PK?: string
  readonly VITE_REVIEWDESK_URL?: string // 이용 후기(홈 섹션)
  readonly VITE_REVIEWDESK_PK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.svg' {
  const src: string
  export default src
}
