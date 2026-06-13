import { policyDocumentSchema, type PolicyDocument, type PolicySlug } from './schema'

/**
 * 약관·개인정보처리방침·환불 정책 본문은 TermsDesk 무인증 공개 API에서 가져온다.
 * 앱 자체 백엔드와 무관한 외부 절대 URL이라 `@services/api`(자체 API base 전제)
 * 대신 표준 fetch를 직접 사용한다.
 */
export const TERMSDESK_BASE_URL = 'https://termsdesk.vercel.app'
export const POLICY_ORG_SLUG = 'rotifolk'

export function policyApiUrl(slug: PolicySlug): string {
  return `${TERMSDESK_BASE_URL}/api/public/${POLICY_ORG_SLUG}/policies/${slug}`
}

/** 장애 시 폴백으로 안내하는 TermsDesk 원문(렌더된 공개 페이지) URL. */
export function policyPublicUrl(slug: PolicySlug): string {
  return `${TERMSDESK_BASE_URL}/p/${POLICY_ORG_SLUG}/${slug}`
}

interface FetchPolicyOptions {
  signal?: AbortSignal
}

export async function fetchPolicy(
  slug: PolicySlug,
  { signal }: FetchPolicyOptions = {}
): Promise<PolicyDocument> {
  const response = await fetch(policyApiUrl(slug), {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const parsed = policyDocumentSchema.safeParse(await response.json())
  if (!parsed.success) {
    console.error(`[Policy Validation Error] ${slug}:`, parsed.error)
    throw new Error('TermsDesk policy payload failed validation')
  }

  return parsed.data
}
