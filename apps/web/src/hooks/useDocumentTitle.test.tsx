import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useDocumentTitle } from './useDocumentTitle'

function wrapperAt(path: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  )
}

describe('useDocumentTitle', () => {
  it('홈(/)에서는 기본 브랜드 타이틀을 쓴다', () => {
    renderHook(() => useDocumentTitle(), { wrapper: wrapperAt('/') })
    expect(document.title).toBe('Rotifolk · 로테이션 파티 매칭')
  })

  it('알려진 세그먼트는 "<라벨> · Rotifolk" 형태로 설정한다', () => {
    renderHook(() => useDocumentTitle(), { wrapper: wrapperAt('/discover') })
    expect(document.title).toBe('둘러보기 · Rotifolk')
  })

  it('파라미터가 붙은 라우트도 첫 세그먼트로 매칭한다', () => {
    renderHook(() => useDocumentTitle(), { wrapper: wrapperAt('/parties/abc123') })
    expect(document.title).toBe('파티 · Rotifolk')
  })

  it('매핑되지 않은 경로는 기본 타이틀로 폴백한다', () => {
    renderHook(() => useDocumentTitle(), { wrapper: wrapperAt('/unknown-xyz') })
    expect(document.title).toBe('Rotifolk · 로테이션 파티 매칭')
  })
})
