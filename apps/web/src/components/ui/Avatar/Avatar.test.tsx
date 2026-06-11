import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar 렌더 분기', () => {
  it('imageSrc가 있으면 업로드 사진을 렌더하고 프리셋(이모지)은 숨긴다', () => {
    const { container } = render(<Avatar imageSrc="data:image/webp;base64,QUJD" emoji="🍷" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('data:image/webp;base64,QUJD')
    expect(container.textContent).not.toContain('🍷')
  })

  it('imageSrc가 없으면 기존 프리셋(이모지)으로 폴백한다', () => {
    const { container } = render(<Avatar emoji="🍷" hue="#7A1F3D" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('🍷')
  })

  it('imageSrc가 null(삭제 상태)이어도 이니셜 폴백이 동작한다', () => {
    const { container } = render(<Avatar imageSrc={null} initials="하" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('하')
  })

  it('label이 있으면 컨테이너가 접근성 이름을 제공하고 내부 img는 장식 처리된다', () => {
    render(<Avatar imageSrc="data:image/webp;base64,QUJD" label="하늘님의 아바타" />)
    const named = screen.getByRole('img', { name: '하늘님의 아바타' })
    expect(named.tagName).toBe('DIV')
    expect(named.querySelector('img')!.getAttribute('alt')).toBe('')
    expect(named.querySelector('img')!.getAttribute('aria-hidden')).toBe('true')
  })
})
