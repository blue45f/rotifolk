/**
 * TermsDesk 정책 본문 최소 파서.
 *
 * 본문은 마크다운일 수도, 한국어 조문(`제N조 (제목)` + 문단 + `- ` 불릿)
 * 형식의 평문일 수도 있다. HTML 주입 없이 React 엘리먼트로 안전하게
 * 렌더링할 수 있도록, 문자열을 블록 구조로만 분해한다(인라인 마크업은
 * 의도적으로 다루지 않는 최소 파서 — 원문 그대로 텍스트 노드가 된다).
 */

export type PolicyHeadingLevel = 2 | 3 | 4 | 5 | 6

export interface PolicyHeadingBlock {
  kind: 'heading'
  level: PolicyHeadingLevel
  text: string
}

export interface PolicyParagraphBlock {
  kind: 'paragraph'
  text: string
}

export interface PolicyListBlock {
  kind: 'list'
  ordered: boolean
  items: string[]
}

export interface PolicyDividerBlock {
  kind: 'divider'
}

export type PolicyBlock =
  | PolicyHeadingBlock
  | PolicyParagraphBlock
  | PolicyListBlock
  | PolicyDividerBlock

const MD_HEADING_RE = /^(#{1,6})\s+(.+)$/
const DIVIDER_RE = /^(?:-{3,}|\*{3,}|_{3,})$/
const BULLET_RE = /^[-*+]\s+(.+)$/
const ORDERED_RE = /^\d{1,3}[.)]\s+(.+)$/
const ARTICLE_PREFIX_RE = /^제\d{1,4}조/

/** `제1조` 또는 `제1조 (목적)` 처럼 조문 표제만 단독으로 있는 줄. */
function isArticleHeadingLine(line: string): boolean {
  const article = ARTICLE_PREFIX_RE.exec(line)
  if (!article) return false
  const rest = line.slice(article[0].length).trim()
  if (rest === '') return true
  return rest.startsWith('(') && rest.endsWith(')')
}

/** 페이지 h1(문서명) 아래에 들어가므로 마크다운 헤딩은 한 단계 낮춘다. */
function demoteHeadingLevel(hashCount: number): PolicyHeadingLevel {
  const level = Math.min(hashCount + 1, 6)
  return level as PolicyHeadingLevel
}

export function parsePolicyBody(body: string): PolicyBlock[] {
  const blocks: PolicyBlock[] = []
  let paragraphLines: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraphLines.join('\n') })
      paragraphLines = []
    }
  }

  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (line === '') {
      flushParagraph()
      flushList()
      continue
    }

    const mdHeading = MD_HEADING_RE.exec(line)
    if (mdHeading) {
      flushParagraph()
      flushList()
      blocks.push({
        kind: 'heading',
        level: demoteHeadingLevel(mdHeading[1].length),
        text: mdHeading[2].trim(),
      })
      continue
    }

    if (DIVIDER_RE.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'divider' })
      continue
    }

    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      flushParagraph()
      if (list?.ordered) flushList()
      list ??= { ordered: false, items: [] }
      list.items.push(bullet[1].trim())
      continue
    }

    const ordered = ORDERED_RE.exec(line)
    if (ordered) {
      flushParagraph()
      if (list && !list.ordered) flushList()
      list ??= { ordered: true, items: [] }
      list.items.push(ordered[1].trim())
      continue
    }

    // 조문 표제는 블록의 첫 줄일 때만 헤딩으로 승격한다.
    // (문단 중간의 `제N조...` 인용 줄은 본문으로 남긴다.)
    if (paragraphLines.length === 0 && isArticleHeadingLine(line)) {
      flushList()
      blocks.push({ kind: 'heading', level: 2, text: line })
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}
