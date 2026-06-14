import { z } from 'zod'

/** TermsDesk에 게시된 rotifolk 정책 문서 슬러그. 라우트(/cancel-policy)는 refund-policy로 매핑된다. */
export const POLICY_SLUGS = ['terms-of-service', 'privacy-policy', 'refund-policy'] as const

export const policySlugSchema = z.enum(POLICY_SLUGS)
export type PolicySlug = z.infer<typeof policySlugSchema>

/**
 * TermsDesk 공개 정책 API 응답 (GET /api/public/<org>/policies/<slug>).
 * 핵심 필드(슬러그·이름·본문·버전·해시)만 필수로 강제하고, 나머지 메타는
 * 게시 상태에 따라 비어 있을 수 있어 관대하게 받는다.
 */
export const policyDocumentSchema = z.object({
  policySlug: z.string(),
  name: z.string(),
  type: z.string(),
  locale: z.string(),
  versionLabel: z.string(),
  contentHash: z.string(),
  body: z.string(),
  effectiveAt: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  changeSummary: z.string().nullable().optional(),
})
export type PolicyDocument = z.infer<typeof policyDocumentSchema>
