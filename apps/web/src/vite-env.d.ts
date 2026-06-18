/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SOCKET_URL?: string
  readonly VITE_USE_MSW?: string
  readonly VITE_SURVEYDESK_URL?: string
  // DeskCloud 위젯 — 각 *_URL 설정 시에만 위젯이 활성화된다(*_PK 는 공개 키, 미설정 시 pk_demo).
  readonly VITE_CHANGELOGDESK_URL?: string
  readonly VITE_CHANGELOGDESK_PK?: string
  readonly VITE_NOTIFYDESK_URL?: string
  readonly VITE_NOTIFYDESK_PK?: string
  readonly VITE_SEARCHDESK_URL?: string
  readonly VITE_SEARCHDESK_PK?: string
  readonly VITE_COMMUNITYDESK_URL?: string
  readonly VITE_COMMUNITYDESK_PK?: string
  readonly VITE_CHATDESK_URL?: string
  readonly VITE_CHATDESK_PK?: string
  readonly VITE_REVIEWDESK_URL?: string
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
