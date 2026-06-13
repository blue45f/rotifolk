import { render, renderHook, act } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useDocumentTitle } from './useDocumentTitle'

import type { ReactNode } from 'react'

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

  it('다른 경로로 전환하면 타이틀이 새 라우트로 갱신된다', async () => {
    function Shell() {
      useDocumentTitle()
      return <Outlet />
    }
    function RedirectTo({ to }: { to: string }) {
      const navigate = useNavigate()
      useEffect(() => {
        // 로그인 성공 후 navigate(from, { replace: true }) 흐름을 모사한다.
        void Promise.resolve().then(() => navigate(to, { replace: true }))
      }, [navigate, to])
      return null
    }

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route path="discover" element={<div>discover</div>} />
            <Route path="login" element={<RedirectTo to="/discover" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(document.title).toBe('로그인 · Rotifolk')
    await act(async () => {
      await Promise.resolve()
    })
    expect(document.title).toBe('둘러보기 · Rotifolk')
  })

  it('같은 경로로의 replace 후에도 타이틀을 다시 동기화한다(로그인 타이틀 잔존 방지)', async () => {
    // navigate(from, { replace: true }) 의 from 이 현재 경로와 같으면 pathname 은
    // 그대로지만 location.key 가 바뀐다 — key 의존 덕에 effect 가 다시 돌아 타이틀이 맞춰진다.
    function Shell() {
      useDocumentTitle()
      return <Outlet />
    }
    function ReplaceSelfThenDiscover() {
      const navigate = useNavigate()
      useEffect(() => {
        // 같은 경로로 replace 한 뒤(타이틀이 멈추지 않아야) 실제 목적지로 이동.
        navigate('/login', { replace: true })
        void Promise.resolve().then(() => navigate('/discover', { replace: true }))
      }, [navigate])
      return null
    }

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route path="discover" element={<div>discover</div>} />
            <Route path="login" element={<ReplaceSelfThenDiscover />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(document.title).toBe('둘러보기 · Rotifolk')
  })
})
