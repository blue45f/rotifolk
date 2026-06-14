import { Fragment } from 'react'

import { tokenizeUserText } from './linkify'

/**
 * 유저 본문 전용 안전 렌더러 — HTML을 절대 해석하지 않고 텍스트 노드로만 그리되,
 * http(s) URL만 골라 새 탭 링크로 바꿔준다. javascript:/data: 등 다른 스킴은
 * 평문 그대로 남는다(XSS 방어). 줄바꿈 보존은 부모의 white-space에 맡긴다.
 */
export function LinkifiedText({ text }: { text: string }) {
  const tokens = tokenizeUserText(text)
  return (
    <>
      {tokens.map((token, index) =>
        token.kind === 'link' ? (
          <a key={index} href={token.value} target="_blank" rel="noopener noreferrer">
            {token.value}
          </a>
        ) : (
          <Fragment key={index}>{token.value}</Fragment>
        )
      )}
    </>
  )
}

export default LinkifiedText
