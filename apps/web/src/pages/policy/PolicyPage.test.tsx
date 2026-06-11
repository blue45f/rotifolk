import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PolicyPage from './PolicyPage'

const fetchMock = vi.fn()

const FULL_HASH = 'ab3d6427011de31cb8238cbe64152424ceb68988bbf7531bfc65af7358d8555b'

const termsPayload = {
  policySlug: 'terms-of-service',
  name: '이용약관',
  type: 'terms',
  locale: 'ko',
  versionLabel: 'v1',
  contentHash: FULL_HASH,
  body: '제1조 (목적)\n이 약관은 이용 조건을 정합니다.\n\n- 로테이션 모임\n- 좌석 배정',
  effectiveAt: '2026-06-08T00:00:00.000Z',
  publishedAt: '2026-06-08T00:00:00.000Z',
  changeSummary: 'TermsDesk 중앙 게시본으로 이전',
}

const privacyPayload = {
  ...termsPayload,
  policySlug: 'privacy-policy',
  name: '개인정보처리방침',
  type: 'privacy',
}

const refundPayload = {
  ...termsPayload,
  policySlug: 'refund-policy',
  name: '이용·환불 정책',
  type: 'refund',
}

function mockOk(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function renderPolicyPage(path: '/terms' | '/privacy' | '/cancel-policy') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <PolicyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PolicyPage', () => {
  it('shows a loading skeleton while the document is fetched', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderPolicyPage('/terms')

    expect(screen.getByRole('status', { name: '약관을 불러오는 중' })).toBeInTheDocument()
  })

  it('renders the terms document from the TermsDesk public API', async () => {
    fetchMock.mockImplementation(() => mockOk(termsPayload))
    renderPolicyPage('/terms')

    // 본문: 조문 헤딩 + 문단 + 불릿 리스트
    expect(
      await screen.findByRole('heading', { level: 2, name: '제1조 (목적)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '이용약관' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://termsdesk.vercel.app/api/public/rotifolk/policies/terms-of-service',
    )
    expect(screen.getByText('이 약관은 이용 조건을 정합니다.')).toBeInTheDocument()
    expect(screen.getByText('로테이션 모임')).toBeInTheDocument()
  })

  it('surfaces version, truncated content hash, effective date and source link', async () => {
    fetchMock.mockImplementation(() => mockOk(termsPayload))
    renderPolicyPage('/terms')

    expect(await screen.findByText('v1')).toBeInTheDocument()
    expect(screen.getByText(FULL_HASH.slice(0, 12))).toBeInTheDocument()
    expect(screen.queryByText(FULL_HASH)).not.toBeInTheDocument()
    expect(screen.getByText('2026년 6월 8일')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '원문 보기 ↗' })).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/rotifolk/terms-of-service',
    )
  })

  it('fetches the privacy policy when mounted on /privacy', async () => {
    fetchMock.mockImplementation(() => mockOk(privacyPayload))
    renderPolicyPage('/privacy')

    expect(
      await screen.findByRole('heading', { level: 1, name: '개인정보처리방침' }),
    ).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://termsdesk.vercel.app/api/public/rotifolk/policies/privacy-policy',
    )
  })

  it('maps /cancel-policy to the published refund-policy slug', async () => {
    fetchMock.mockImplementation(() => mockOk(refundPayload))
    renderPolicyPage('/cancel-policy')

    // h1은 폴백 문서명과 게시명이 같으므로, 본문 헤딩으로 데이터 로드를 기다린다.
    expect(
      await screen.findByRole('heading', { level: 2, name: '제1조 (목적)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '이용·환불 정책' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://termsdesk.vercel.app/api/public/rotifolk/policies/refund-policy',
    )
    expect(screen.getByRole('link', { name: '원문 보기 ↗' })).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/rotifolk/refund-policy',
    )
  })

  it('falls back to an external source link on error and recovers via retry', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(() => new Response('{}', { status: 503 }))
    renderPolicyPage('/terms')

    expect(await screen.findByText('약관을 불러오지 못했어요')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: '원문 페이지에서 보기 ↗' })).toHaveAttribute(
      'href',
      'https://termsdesk.vercel.app/p/rotifolk/terms-of-service',
    )

    fetchMock.mockImplementation(() => mockOk(termsPayload))
    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: '제1조 (목적)' })).toBeInTheDocument(),
    )
  })

  it('cross-links the sibling policy documents as internal routes', async () => {
    fetchMock.mockImplementation(() => mockOk(termsPayload))
    renderPolicyPage('/terms')

    await screen.findByRole('heading', { level: 2, name: '제1조 (목적)' })

    const docNav = screen.getByRole('navigation', { name: '다른 약관 문서' })
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    )
    expect(screen.getByRole('link', { name: '이용·환불 정책' })).toHaveAttribute(
      'href',
      '/cancel-policy',
    )
    expect(screen.getByRole('link', { name: '약관·정책 안내' })).toHaveAttribute(
      'href',
      '/policies',
    )
    expect(docNav).toContainElement(screen.getByRole('link', { name: '개인정보처리방침' }))
  })
})
