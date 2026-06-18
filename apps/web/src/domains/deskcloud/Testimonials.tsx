/**
 * 이용 후기(Testimonials) — ReviewDesk 네이티브 연동.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 createReviewClient(pk_) 로 승인된 후기 월(getWall)을 받아
 * 앱의 자체 컴포넌트·디자인 토큰으로 렌더한다(외부 위젯 CSS·번들 없음).
 *
 * VITE_REVIEWDESK_URL 미설정 시 아무것도 렌더하지 않는다(앱 본문 그대로 유지).
 * 따라서 홈 페이지에 무조건 끼워 넣어도 안전하다(env 로만 활성화 = 되돌림 가능).
 */
import { useEffect, useMemo, useState } from 'react'

import styles from './Testimonials.module.css'

import { getReviewDesk } from '@/domains/deskcloud/clients'

interface Testimonial {
  id: string
  rating: number
  title: string | null
  body: string
  authorName: string
  createdAt: string
}

type Phase = 'loading' | 'ready' | 'hidden'

const MAX_RATING = 5

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value)
  return (
    <span className={styles.stars} role="img" aria-label={`${MAX_RATING}점 만점에 ${value}점`}>
      {Array.from({ length: MAX_RATING }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < rounded ? styles.starOn : styles.starOff}>
          ★
        </span>
      ))}
    </span>
  )
}

export function Testimonials({ limit = 3 }: { limit?: number }) {
  // 클라이언트 생성을 렌더 시점에 결정 — env 미설정이면 effect 없이 즉시 null 반환.
  const client = useMemo(() => getReviewDesk(), [])
  const [phase, setPhase] = useState<Phase>('loading')
  const [items, setItems] = useState<Testimonial[]>([])

  useEffect(() => {
    if (!client) return
    const ctrl = new AbortController()
    client
      .getWall({ limit, signal: ctrl.signal })
      .then((wall) => {
        if (ctrl.signal.aborted) return
        const next = wall.items.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          authorName: r.authorName,
          createdAt: r.createdAt,
        }))
        setItems(next)
        // 후기가 없으면 섹션을 숨겨 빈 공간을 만들지 않는다.
        setPhase(next.length > 0 ? 'ready' : 'hidden')
      })
      .catch(() => {
        // 후기 조회 실패는 조용히 숨긴다 — 핵심 본문에 영향 주지 않음.
        if (!ctrl.signal.aborted) setPhase('hidden')
      })
    return () => ctrl.abort()
  }, [client, limit])

  if (!client || phase === 'hidden') return null

  return (
    <section className={`container ${styles.section}`} aria-labelledby="reviews-title">
      <header className={styles.head}>
        <h2 id="reviews-title" className={styles.title}>
          먼저 다녀온 사람들의 한 잔
        </h2>
        <p className={styles.sub}>로테이션을 마친 분들이 남긴 진짜 후기예요.</p>
      </header>

      {phase === 'loading' ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: limit }, (_, i) => (
            <div key={i} className={styles.skeleton} aria-hidden="true">
              <span className={styles.skLine} style={{ width: '38%' }} />
              <span className={styles.skLine} style={{ width: '92%' }} />
              <span className={styles.skLine} style={{ width: '74%' }} />
            </div>
          ))}
        </div>
      ) : (
        <ul className={styles.grid}>
          {items.map((t) => (
            <li key={t.id}>
              <figure className={styles.card}>
                <Stars value={t.rating} />
                <blockquote className={styles.quote}>
                  {t.title ? <strong className={styles.quoteTitle}>{t.title}</strong> : null}
                  {t.body}
                </blockquote>
                <figcaption className={styles.foot}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initial(t.authorName)}
                  </span>
                  <span className={styles.author}>{t.authorName}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Testimonials
