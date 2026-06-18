/**
 * DeskCloud — 네이티브 SDK 연동의 단일 진입점.
 * ──────────────────────────────────────────────────────────────────────────
 * 공개 npm 패키지 `@heejun/deskcloud` 의 브라우저(pk_) 클라이언트만 사용한다.
 * 절대 `@heejun/deskcloud/server`(sk_ 서버 전용)를 import 하지 않는다.
 *
 * 각 Desk 는 해당 `VITE_<DESK>DESK_URL` 이 설정됐을 때만 활성화된다(미설정 = 비활성).
 * 미설정 시 앱의 기존 1차(first-party) 기능으로 자연 폴백한다(되돌림 가능).
 * 퍼블리시 키(pk_)는 브라우저 노출이 안전하며, 미지정 시 `pk_demo` 로 폴백한다.
 *
 * 위젯(외부 CSS·번들)을 마운트하지 않는다 — 데이터만 SDK 로 받아 앱 컴포넌트·토큰으로 렌더한다.
 */
import {
  createChangelogClient,
  createReviewClient,
  createSurveyClient,
  type ChangelogClient,
  type ReviewClient,
  type SurveyClient,
} from '@heejun/deskcloud'

const env = import.meta.env

/** pk_ 키 헬퍼 — 미설정 시 데모 키로 폴백(브라우저 노출 안전). */
function pk(value: string | undefined): string {
  return value && value.trim().length > 0 ? value : 'pk_demo'
}

/** Desk 별 연동 활성 여부 + 클라이언트 팩토리. 각 URL 이 있을 때만 클라이언트를 만든다. */
export interface SurveyDeskConfig {
  appId: string
  client: SurveyClient
}
export function getSurveyDesk(appId = 'rotifolk'): SurveyDeskConfig | null {
  const endpoint = env.VITE_SURVEYDESK_URL
  if (!endpoint) return null
  return {
    appId,
    client: createSurveyClient({ endpoint, publishableKey: pk(env.VITE_SURVEYDESK_PK) }),
  }
}

export function getChangelogDesk(): ChangelogClient | null {
  const endpoint = env.VITE_CHANGELOGDESK_URL
  if (!endpoint) return null
  return createChangelogClient({ endpoint, publishableKey: pk(env.VITE_CHANGELOGDESK_PK) })
}

export function getReviewDesk(): ReviewClient | null {
  const endpoint = env.VITE_REVIEWDESK_URL
  if (!endpoint) return null
  return createReviewClient({ endpoint, publishableKey: pk(env.VITE_REVIEWDESK_PK) })
}

/** 익명 식별자 — ChangelogDesk 의 미읽음/읽음 추적에 쓰는 디바이스 anonId. */
const ANON_KEY = 'rotifolk:deskcloud:anonId'
let anonMemory: string | null = null
export function getAnonId(): string {
  if (typeof localStorage !== 'undefined') {
    try {
      const existing = localStorage.getItem(ANON_KEY)
      if (existing) return existing
      const created = crypto.randomUUID()
      localStorage.setItem(ANON_KEY, created)
      return created
    } catch {
      /* 스토리지 차단 → 메모리 폴백 */
    }
  }
  if (!anonMemory) anonMemory = crypto.randomUUID()
  return anonMemory
}
