import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildInquiryPayload,
  createInquiry,
  extractInquiryErrorMessage,
  INQUIRY_ENDPOINT,
  validateInquiryInput,
} from './inquiries'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('validateInquiryInput', () => {
  it('정상 입력은 null(통과)을 돌려준다', () => {
    expect(
      validateInquiryInput({
        category: 'bug',
        title: '라이브 라운드 타이머가 멈춰요',
        body: '두 번째 라운드부터 타이머가 0초에서 멈춘 채 진행되지 않았습니다.',
      }),
    ).toBeNull()
  })

  it('제목/본문 길이 경계를 검증한다 (2..140 / 10..4000)', () => {
    expect(
      validateInquiryInput({ category: 'contact', title: 'a', body: '열 글자 이상인 본문입니다.' }),
    ).toMatch(/제목/)
    expect(validateInquiryInput({ category: 'contact', title: '제목 정상', body: '짧음' })).toMatch(
      /내용/,
    )
  })

  it('회신 이메일 형식이 틀리면 거부한다 (빈 값은 허용)', () => {
    expect(
      validateInquiryInput({
        category: 'qa',
        title: '플로우 피드백',
        body: '결제 단계 흐름에 대한 피드백입니다.',
        contactEmail: 'not-an-email',
      }),
    ).toMatch(/이메일/)
    expect(
      validateInquiryInput({
        category: 'qa',
        title: '플로우 피드백',
        body: '결제 단계 흐름에 대한 피드백입니다.',
        contactEmail: '',
      }),
    ).toBeNull()
  })
})

describe('buildInquiryPayload', () => {
  it('트리밍·빈 이메일 제거·허니팟 빈값·originUrl을 채운다', () => {
    const payload = buildInquiryPayload(
      {
        category: 'partnership',
        title: '  공간 제휴 제안  ',
        body: '  한남동 와인바 공동 운영 제안드립니다.  ',
        contactEmail: '  ',
      },
      'https://rotifolk.example/support',
    )
    expect(payload.title).toBe('공간 제휴 제안')
    expect(payload.body).toBe('한남동 와인바 공동 운영 제안드립니다.')
    expect('contactEmail' in payload).toBe(false)
    expect(payload.website).toBe('')
    expect(payload.originUrl).toBe('https://rotifolk.example/support')
  })
})

describe('extractInquiryErrorMessage', () => {
  it('message 배열/문자열/없음을 모두 처리한다', () => {
    expect(extractInquiryErrorMessage({ message: ['제목이 짧아요'] }, '기본')).toBe('제목이 짧아요')
    expect(extractInquiryErrorMessage({ message: '본문 오류' }, '기본')).toBe('본문 오류')
    expect(extractInquiryErrorMessage({}, '기본')).toBe('기본')
    expect(extractInquiryErrorMessage(null, '기본')).toBe('기본')
  })
})

describe('createInquiry', () => {
  const validInput = {
    category: 'contact' as const,
    title: '계정 관련 문의',
    body: '닉네임 변경이 가능한지 궁금합니다.',
  }

  it('성공 시 영수증을 돌려준다', async () => {
    const receipt = {
      id: 'inq_1',
      siteSlug: 'rotifolk',
      category: 'contact',
      status: 'new',
      createdAt: '2026-06-10T00:00:00.000Z',
    }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(receipt), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createInquiry(validInput, 'https://rotifolk.example/support')
    expect(result.id).toBe('inq_1')
    expect(fetchMock).toHaveBeenCalledWith(
      INQUIRY_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('429는 스로틀 안내 메시지로 변환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 429 })),
    )
    await expect(createInquiry(validInput, 'https://x.example')).rejects.toThrow(/너무 잦아요/)
  })

  it('네트워크 실패는 연결 실패 메시지로 변환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down')
      }),
    )
    await expect(createInquiry(validInput, 'https://x.example')).rejects.toThrow(
      /연결하지 못했어요/,
    )
  })
})
