import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkifiedText } from './LinkifiedText'
import { tokenizeUserText } from './linkify'

describe('tokenizeUserText', () => {
  it('http(s) URL만 링크 토큰으로 분리한다', () => {
    const tokens = tokenizeUserText('여기 https://example.com/a?b=1 그리고 http://foo.kr 끝')
    expect(tokens.filter((t) => t.kind === 'link').map((t) => t.value)).toEqual([
      'https://example.com/a?b=1',
      'http://foo.kr',
    ])
  })

  it('javascript:/data: 스킴은 링크로 만들지 않는다', () => {
    const tokens = tokenizeUserText('주의 javascript:alert(1) data:text/html,hi ftp://x')
    expect(tokens.every((t) => t.kind === 'text')).toBe(true)
  })

  it('문장 끝 구두점은 링크에서 분리한다', () => {
    const tokens = tokenizeUserText('보세요 https://example.com.')
    const link = tokens.find((t) => t.kind === 'link')
    expect(link?.value).toBe('https://example.com')
  })
})

describe('LinkifiedText', () => {
  it('HTML 마크업을 해석하지 않고 평문으로 그린다', () => {
    render(
      <p>
        <LinkifiedText text={'<img src=x onerror=alert(1)> 안녕'} />
      </p>,
    )
    expect(screen.getByText(/onerror=alert\(1\)/)).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('URL은 noopener noreferrer 새 탭 링크로 그린다', () => {
    render(
      <p>
        <LinkifiedText text="공지 https://rotifolk.example/notice 확인" />
      </p>,
    )
    const anchor = screen.getByRole('link', { name: 'https://rotifolk.example/notice' })
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
