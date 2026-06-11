/**
 * 유저 본문 토크나이저 — http(s) URL만 링크 토큰으로 분리한다.
 * javascript:/data: 등 다른 스킴은 평문 그대로 남는다(XSS 방어).
 */

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g

export interface UserTextToken {
  kind: 'text' | 'link'
  value: string
}

/** 본문을 텍스트/링크 토큰으로 쪼갠다 — 렌더와 테스트가 같은 경계를 쓴다. */
export function tokenizeUserText(text: string): UserTextToken[] {
  const tokens: UserTextToken[] = []
  let cursor = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0
    if (index > cursor) tokens.push({ kind: 'text', value: text.slice(cursor, index) })
    // 문장 끝 구두점은 링크에서 떼어 텍스트로 돌려준다.
    let url = match[0]
    const trailing = url.match(/[.,!?;:]+$/)
    if (trailing) url = url.slice(0, -trailing[0].length)
    if (url.length > 0) tokens.push({ kind: 'link', value: url })
    if (trailing) tokens.push({ kind: 'text', value: trailing[0] })
    cursor = index + match[0].length
  }
  if (cursor < text.length) tokens.push({ kind: 'text', value: text.slice(cursor) })
  return tokens
}
