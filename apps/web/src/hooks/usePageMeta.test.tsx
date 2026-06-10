import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SITE_ORIGIN, usePageMeta, type PageMeta } from './usePageMeta'

const JSON_LD_SELECTOR = 'script[type="application/ld+json"][data-page-meta-jsonld]'

function injectedJsonLd(): HTMLScriptElement | null {
  return document.head.querySelector<HTMLScriptElement>(JSON_LD_SELECTOR)
}

/** index.html의 정적 canonical/og:url 기본 태그를 jsdom head에 재현한다 (테스트 후 직접 제거). */
function injectCanonicalTags(): { canonical: HTMLLinkElement; ogUrl: HTMLMetaElement } {
  const canonical = document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = `${SITE_ORIGIN}/`
  const ogUrl = document.createElement('meta')
  ogUrl.setAttribute('property', 'og:url')
  ogUrl.content = `${SITE_ORIGIN}/`
  document.head.append(canonical, ogUrl)
  return { canonical, ogUrl }
}

describe('usePageMeta', () => {
  it('title을 브랜드 접미사와 함께 적용하고, 언마운트 시 기본값으로 복원한다', () => {
    const { unmount } = renderHook(() => usePageMeta({ title: '한남 와인 로테이션' }))
    expect(document.title).toBe('한남 와인 로테이션 · Rotifolk')

    unmount()
    expect(document.title).toBe('Rotifolk · 로테이션 파티 매칭')
  })

  it('path를 넘기면 canonical·og:url을 프로덕션 URL로 갱신하고, 언마운트 시 루트로 복원한다', () => {
    const { canonical, ogUrl } = injectCanonicalTags()
    const { unmount } = renderHook(() => usePageMeta({ title: '와인 파티', path: '/parties/p1' }))

    expect(canonical.href).toBe(`${SITE_ORIGIN}/parties/p1`)
    expect(ogUrl.content).toBe(`${SITE_ORIGIN}/parties/p1`)

    unmount()
    expect(canonical.href).toBe(`${SITE_ORIGIN}/`)
    expect(ogUrl.content).toBe(`${SITE_ORIGIN}/`)
    canonical.remove()
    ogUrl.remove()
  })

  it('path를 생략하면 현재 location.pathname을 canonical 경로로 쓴다', () => {
    const { canonical, ogUrl } = injectCanonicalTags()
    window.history.pushState({}, '', '/discover')
    const { unmount } = renderHook(() => usePageMeta({ title: '둘러보기' }))

    expect(canonical.href).toBe(`${SITE_ORIGIN}/discover`)
    expect(ogUrl.content).toBe(`${SITE_ORIGIN}/discover`)

    unmount()
    window.history.pushState({}, '', '/')
    canonical.remove()
    ogUrl.remove()
  })

  it('jsonLd가 없으면 JSON-LD script를 주입하지 않는다', () => {
    const { unmount } = renderHook(() => usePageMeta({ title: '둘러보기' }))
    expect(injectedJsonLd()).toBeNull()
    unmount()
  })

  it('jsonLd를 넘기면 head에 application/ld+json script로 주입한다', () => {
    const jsonLd = { '@context': 'https://schema.org', '@type': 'Event', name: '와인 파티' }
    const { unmount } = renderHook(() => usePageMeta({ title: '와인 파티', jsonLd }))

    const script = injectedJsonLd()
    expect(script).not.toBeNull()
    expect(JSON.parse(script!.text)).toEqual(jsonLd)
    unmount()
  })

  it('jsonLd 내용이 바뀌면 script를 갱신하고, 같은 내용의 새 객체로는 재주입하지 않는다', () => {
    const { rerender, unmount } = renderHook((props: PageMeta) => usePageMeta(props), {
      initialProps: { jsonLd: { '@type': 'Event', name: 'before' } },
    })
    const first = injectedJsonLd()

    // 내용이 같은 새 객체 — 직렬화 deps 덕에 동일 노드가 유지된다.
    rerender({ jsonLd: { '@type': 'Event', name: 'before' } })
    expect(injectedJsonLd()).toBe(first)

    rerender({ jsonLd: { '@type': 'Event', name: 'after' } })
    const updated = injectedJsonLd()
    expect(updated).not.toBe(first)
    expect(JSON.parse(updated!.text).name).toBe('after')
    expect(document.head.querySelectorAll(JSON_LD_SELECTOR)).toHaveLength(1)
    unmount()
  })

  it('언마운트 시 주입한 JSON-LD script를 제거한다', () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ jsonLd: { '@type': 'Event', name: '제거 대상' } }),
    )
    expect(injectedJsonLd()).not.toBeNull()

    unmount()
    expect(injectedJsonLd()).toBeNull()
  })
})
