import { Button } from '@components/ui/Button/Button'
import { CATEGORY_META } from '@features/categories/meta'
import { useRecents } from '@features/recents/useRecents'
import { Link, useLocation } from 'react-router-dom'

import styles from './NotFound.module.css'

interface Suggestion {
  to: string
  emoji: string
  label: string
  hint: string
}

const POPULAR: Suggestion[] = [
  { to: '/discover', emoji: '🍷', label: '파티 둘러보기', hint: '오늘/이번 주 열리는 모임 보기' },
  { to: '/quick', emoji: '⚡', label: '즉석 파티 열기', hint: '5분 만에 한 잔 모임을 시작해요' },
  { to: '/neighborhood', emoji: '📍', label: '내 동네', hint: '걸어갈 수 있는 거리의 모임' },
  { to: '/help', emoji: '💡', label: 'FAQ', hint: '처음이라면 여기부터' },
  { to: '/tutorial', emoji: '🧭', label: '튜토리얼', hint: '8단계로 첫 진입 동선 따라가기' },
  { to: '/policies', emoji: '📜', label: '정책', hint: '환불/개인정보/안전 정책 보기' },
  { to: '/terms', emoji: '🧾', label: '이용약관', hint: '약관 항목을 빠르게 확인해요' },
]

function pathHint(pathname: string): { hint: string; cta?: Suggestion } {
  const lower = pathname.toLowerCase()
  if (lower.includes('chat')) {
    return {
      hint: '채팅을 찾고 있었나요?',
      cta: { to: '/chats', emoji: '💌', label: '채팅 목록', hint: '내가 속한 채팅방' },
    }
  }
  if (lower.includes('host') || lower.includes('console')) {
    return {
      hint: '호스트 페이지를 찾고 있었나요?',
      cta: { to: '/host', emoji: '🎙️', label: '호스트 콘솔', hint: '내가 연 모임 관리' },
    }
  }
  if (lower.includes('payment') || lower.includes('order')) {
    return {
      hint: '결제 페이지를 찾고 있었나요?',
      cta: { to: '/me/payments', emoji: '🧾', label: '결제 내역', hint: '최근 100건' },
    }
  }
  if (lower.includes('part')) {
    return {
      hint: '특정 파티 페이지가 더 이상 없거나 URL이 잘못된 것 같아요.',
      cta: { to: '/discover', emoji: '🔎', label: '파티 검색', hint: '비슷한 모임 찾기' },
    }
  }
  if (lower.includes('me') || lower.includes('profile')) {
    return {
      hint: '프로필을 찾고 있었나요?',
      cta: { to: '/me', emoji: '🌙', label: '내 프로필', hint: '아바타·관심사·후기' },
    }
  }
  return { hint: '아래에서 가던 길을 다시 골라보세요.' }
}

export default function NotFoundPage() {
  const location = useLocation()
  const { pathname } = location
  const { hint, cta } = pathHint(pathname)
  const { items: recents } = useRecents()
  const recentTop = recents.slice(0, 4)
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  const currentPathEncoded = encodeURIComponent(currentPath || '/')
  const popularWithReturn = POPULAR.map((suggestion) =>
    suggestion.to === '/help'
      ? { ...suggestion, to: `/help?from=${currentPathEncoded}` }
      : suggestion.to === '/tutorial'
        ? { ...suggestion, to: `/tutorial?from=${currentPathEncoded}` }
        : suggestion.to === '/policies'
          ? { ...suggestion, to: `/policies?from=${currentPathEncoded}` }
          : suggestion.to === '/terms'
            ? { ...suggestion, to: `/terms?from=${currentPathEncoded}` }
            : suggestion
  )

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.moon} aria-hidden="true">
          🌙
        </div>
        <h1 className={styles.title}>여기엔 잔이 없어요</h1>
        <p className={styles.path}>
          <code>{pathname}</code>
        </p>
        <p className={styles.hint}>{hint}</p>
        <Link to="/" className={styles.primaryCta}>
          <Button size="lg">홈으로 돌아가기</Button>
        </Link>
      </div>

      {cta && (
        <section className={styles.section}>
          <h2>혹시 이걸 찾으셨나요?</h2>
          <Link to={cta.to} className={styles.suggestionCard}>
            <span className={styles.suggestionEmoji}>{cta.emoji}</span>
            <span className={styles.suggestionBody}>
              <strong>{cta.label}</strong>
              <small>{cta.hint}</small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      <section className={styles.section}>
        <h2>자주 가는 페이지</h2>
        <div className={styles.suggestionGrid}>
          {popularWithReturn.map((p) => (
            <Link key={p.to} to={p.to} className={styles.suggestionCard}>
              <span className={styles.suggestionEmoji}>{p.emoji}</span>
              <span className={styles.suggestionBody}>
                <strong>{p.label}</strong>
                <small>{p.hint}</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      {recentTop.length > 0 && (
        <section className={styles.section}>
          <h2>최근 본 모임</h2>
          <div className={styles.suggestionGrid}>
            {recentTop.map((r) => {
              const cat = CATEGORY_META[r.category as keyof typeof CATEGORY_META]
              return (
                <Link key={r.id} to={`/parties/${r.id}`} className={styles.suggestionCard}>
                  <span className={styles.suggestionEmoji} style={{ background: cat?.bgGradient }}>
                    {cat?.emoji ?? '🍷'}
                  </span>
                  <span className={styles.suggestionBody}>
                    <strong>{r.title}</strong>
                    <small>{cat?.shortLabel ?? r.category}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
