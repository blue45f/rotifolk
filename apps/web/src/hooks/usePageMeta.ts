import { useEffect } from 'react'

const BRAND = 'Rotifolk'
const DEFAULT_TITLE = 'Rotifolk · 로테이션 파티 매칭'
const DEFAULT_DESCRIPTION =
  '와인·커피·차 로테이션 모임. 모르는 사람들이 진짜 친해지는 5분 라운드 — Rotifolk'

/**
 * 프로덕션 정식 출처(끝 슬래시 없음). index.html의 정적 canonical/OG/JSON-LD 블록과
 * 같은 값을 가리키는 런타임 단일 출처다 — 도메인이 바뀌면 index.html과 함께 갱신한다.
 * 파티 상세의 Event JSON-LD url(PartyDetailPage → buildPartyEventJsonLd)도 이 값으로 만든다.
 */
export const SITE_ORIGIN = 'https://rotifolk.vercel.app'

/** index.html의 정적 canonical/og:url 기본값 — 라우트 이탈 시 이 값으로 복원한다. */
const DEFAULT_CANONICAL = `${SITE_ORIGIN}/`

export interface PageMeta {
  /** 탭/공유 카드 제목. 생략 시 브랜드 기본값으로 되돌린다. `withBrand`가 true면 ` · Rotifolk`를 붙인다. */
  title?: string
  /** 메타·OG·Twitter 설명. 생략 시 사이트 기본 설명으로 되돌린다. */
  description?: string
  /** title 뒤에 ` · Rotifolk`를 자동으로 붙일지 (기본 true). 이미 브랜드를 포함한 제목이면 false. */
  withBrand?: boolean
  /**
   * canonical·og:url에 쓸 경로(선행 `/` 포함, 예: `/parties/p1`). 생략 시 현재
   * location.pathname. 쿼리스트링 없는 정식 경로만 넘긴다 — 필터/탭 변형이 한 URL로 정규화되게.
   */
  path?: string
  /**
   * 라우트별 구조화 데이터(schema.org JSON-LD). 넘기면 <head>에
   * `<script type="application/ld+json">`으로 주입하고 라우트 이탈 시 제거한다.
   * 데이터 로딩 중에는 undefined를 넘겨 주입을 미룰 수 있다.
   */
  jsonLd?: Record<string, unknown>
}

/** usePageMeta가 주입한 JSON-LD script를 표시하는 속성 (index.html의 정적 블록과 구분). */
const JSON_LD_ATTR = 'data-page-meta-jsonld'

/** name= 또는 property= 메타 태그의 content를 갱신한다(없으면 무시 — 정적 기본값은 index.html이 보장). */
function setMetaContent(selector: string, content: string): void {
  const el = document.head.querySelector<HTMLMetaElement>(selector)
  if (el) el.content = content
}

/** link[rel=canonical]의 href를 갱신한다(없으면 무시 — 정적 기본값은 index.html이 보장). */
function setCanonicalHref(href: string): void {
  const el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (el) el.href = href
}

/**
 * 라우트별 동적 메타(제목·설명·OG/Twitter description·canonical·og:url)를 네이티브로 갱신한다.
 * 새 의존성 없이 useEffect 한 번으로 동작하며, index.html의 강한 정적 OG 기본값을
 * 보강(override)한다. 데이터 로딩 중에는 빈 값을 넘겨 기본값을 유지할 수 있다.
 *
 * document.title 의 라우트 세그먼트 기본 동기화는 useDocumentTitle(RootLayout)이 담당하므로,
 * 이 훅은 데이터에 의존하는 더 구체적인 제목/설명이 필요한 페이지에서만 호출한다.
 *
 * 주의: SPA 크롤은 정적 index.html 메타만 읽는 봇이 많다. 이 훅은 동적 OG의 점진적 향상이며
 * (루트 고정 정적 태그가 폴백), 정식 라우트별 OG가 필요하면 서버사이드/프리렌더가 별도로
 * 필요하다(형제 webtoon-index 참조). 반면 JSON-LD와 canonical·og:url은 Google이 JS 실행 후
 * 읽으므로 동적 갱신만으로도 리치 결과·정규화 신호에 유효하다 — sitemap(/api/seo)의
 * 라우트별 URL과 모순되지 않게 페이지마다 자기 URL을 가리킨다.
 */
export function usePageMeta(meta: PageMeta): void {
  const { title, description, withBrand = true, path, jsonLd } = meta
  // 호출부가 렌더마다 새 객체를 만들어도 effect가 헛돌지 않도록 직렬화 문자열을 deps로 쓴다.
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : undefined
  // 렌더 시점에 풀어 deps에 넣는다 — 같은 컴포넌트가 파라미터만 바뀌며 재사용돼도 canonical이 따라온다.
  const canonicalPath = path ?? (typeof window === 'undefined' ? '/' : window.location.pathname)

  useEffect(() => {
    const resolvedTitle = title ? (withBrand ? `${title} · ${BRAND}` : title) : DEFAULT_TITLE
    document.title = resolvedTitle
    setMetaContent('meta[property="og:title"]', resolvedTitle)
    setMetaContent('meta[name="twitter:title"]', resolvedTitle)

    const resolvedDescription = description || DEFAULT_DESCRIPTION
    setMetaContent('meta[name="description"]', resolvedDescription)
    setMetaContent('meta[property="og:description"]', resolvedDescription)
    setMetaContent('meta[name="twitter:description"]', resolvedDescription)

    const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`
    setCanonicalHref(canonicalUrl)
    setMetaContent('meta[property="og:url"]', canonicalUrl)

    return () => {
      // 라우트 이탈 시 기본값으로 복원해 다음 라우트가 stale 메타를 물려받지 않게 한다.
      // (document.title 은 useDocumentTitle 이 다음 라우트에서 다시 세팅한다.)
      document.title = DEFAULT_TITLE
      setMetaContent('meta[property="og:title"]', DEFAULT_TITLE)
      setMetaContent('meta[name="twitter:title"]', DEFAULT_TITLE)
      setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION)
      setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION)
      setMetaContent('meta[name="twitter:description"]', DEFAULT_DESCRIPTION)
      setCanonicalHref(DEFAULT_CANONICAL)
      setMetaContent('meta[property="og:url"]', DEFAULT_CANONICAL)
    }
  }, [title, description, withBrand, canonicalPath])

  useEffect(() => {
    if (!jsonLdText) return
    // DOM API로 넣는 text는 HTML 파서를 거치지 않으므로 내용 escape가 필요 없다.
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(JSON_LD_ATTR, '')
    script.text = jsonLdText
    document.head.append(script)
    return () => {
      // 라우트 이탈/데이터 변경 시 제거해 다음 라우트가 stale 구조화 데이터를 물려받지 않게 한다.
      script.remove()
    }
  }, [jsonLdText])
}
