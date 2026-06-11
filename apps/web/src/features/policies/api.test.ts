import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchPolicy, policyApiUrl, policyPublicUrl } from './api'

const fetchMock = vi.fn()

const basePayload = {
  policySlug: 'terms-of-service',
  name: '이용약관',
  type: 'terms',
  locale: 'ko',
  versionLabel: 'v1',
  contentHash: 'c3d68e74416edb9d7da055350d853de5dfa8ea74486dbabac9f8c9ac62c7e207',
  body: '제1조 (목적)\n본문',
  effectiveAt: '2026-06-08T00:00:00.000Z',
  publishedAt: '2026-06-08T00:00:00.000Z',
}

const validPayload = { ...basePayload, changeSummary: 'TermsDesk 중앙 게시본으로 이전' }

function mockOk(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('policy urls', () => {
  it('builds the TermsDesk public JSON endpoint per slug', () => {
    expect(policyApiUrl('terms-of-service')).toBe(
      'https://termsdesk.vercel.app/api/public/rotifolk/policies/terms-of-service',
    )
    expect(policyApiUrl('privacy-policy')).toBe(
      'https://termsdesk.vercel.app/api/public/rotifolk/policies/privacy-policy',
    )
    expect(policyApiUrl('refund-policy')).toBe(
      'https://termsdesk.vercel.app/api/public/rotifolk/policies/refund-policy',
    )
  })

  it('builds the rendered fallback page url per slug', () => {
    expect(policyPublicUrl('refund-policy')).toBe(
      'https://termsdesk.vercel.app/p/rotifolk/refund-policy',
    )
  })
})

describe('fetchPolicy', () => {
  it('fetches and parses a published policy document', async () => {
    fetchMock.mockResolvedValue(mockOk(validPayload))

    const policy = await fetchPolicy('terms-of-service')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(policyApiUrl('terms-of-service'))
    expect(policy.name).toBe('이용약관')
    expect(policy.versionLabel).toBe('v1')
    expect(policy.contentHash).toBe(validPayload.contentHash)
  })

  it('tolerates extra fields and missing optional metadata', async () => {
    fetchMock.mockResolvedValue(
      mockOk({ ...basePayload, orgName: 'Rotifolk', availableVersions: ['v1'] }),
    )

    const policy = await fetchPolicy('terms-of-service')

    expect(policy.changeSummary).toBeUndefined()
    expect(policy.body).toBe(validPayload.body)
  })

  it('throws on non-2xx responses', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }))

    await expect(fetchPolicy('terms-of-service')).rejects.toThrow('HTTP error! status: 503')
  })

  it('throws when the payload fails schema validation', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(mockOk({ policySlug: 'terms-of-service' }))

    await expect(fetchPolicy('terms-of-service')).rejects.toThrow(
      'TermsDesk policy payload failed validation',
    )
    consoleError.mockRestore()
  })

  it('forwards the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(mockOk(validPayload))
    const controller = new AbortController()

    await fetchPolicy('privacy-policy', { signal: controller.signal })

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal })
  })
})
