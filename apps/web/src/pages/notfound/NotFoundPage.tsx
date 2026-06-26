import { Button } from '@components/ui/Button/Button'
import EnchantingTitle from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Icon, type IconName } from '@components/ui/Icon/Icon'
import { Link, useLocation } from 'react-router-dom'

import styles from './NotFound.module.css'

import { CATEGORY_META } from '@/domains/categories/meta'
import { useRecents } from '@/domains/recents/useRecents'

interface Suggestion {
  to: string
  /** Inline line-glyph (preferred). Falls back to `emoji` when absent. */
  icon?: IconName
  /** Kept only where no Icon glyph fits (FAQ, receipts). */
  emoji?: string
  label: string
  hint: string
}

const POPULAR: Suggestion[] = [
  {
    to: '/discover',
    icon: 'compass',
    label: '파티 둘러보기',
    hint: '오늘/이번 주 열리는 모임 보기',
  },
  { to: '/quick', icon: 'bolt', label: '즉석 파티 열기', hint: '5분 만에 한 잔 모임을 시작해요' },
  { to: '/neighborhood', icon: 'pin', label: '내 동네', hint: '걸어갈 수 있는 거리의 모임' },
  { to: '/help', emoji: '💡', label: 'FAQ', hint: '처음이라면 여기부터' },
  { to: '/tutorial', icon: 'sparkle', label: '튜토리얼', hint: '8단계로 첫 진입 동선 따라가기' },
  { to: '/policies', icon: 'shield', label: '정책', hint: '환불/개인정보/안전 정책 보기' },
  { to: '/terms', emoji: '🧾', label: '이용약관', hint: '약관 항목을 빠르게 확인해요' },
]

function pathHint(pathname: string): { hint: string; cta?: Suggestion } {
  const lower = pathname.toLowerCase()
  if (lower.includes('chat')) {
    return {
      hint: '채팅을 찾고 있었나요?',
      cta: { to: '/chats', icon: 'chat', label: '채팅 목록', hint: '내가 속한 채팅방' },
    }
  }
  if (lower.includes('host') || lower.includes('console')) {
    return {
      hint: '호스트 페이지를 찾고 있었나요?',
      cta: { to: '/host', icon: 'shield', label: '호스트 콘솔', hint: '내가 연 모임 관리' },
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
      cta: { to: '/discover', icon: 'search', label: '파티 검색', hint: '비슷한 모임 찾기' },
    }
  }
  if (lower.includes('me') || lower.includes('profile')) {
    return {
      hint: '프로필을 찾고 있었나요?',
      cta: { to: '/me', icon: 'user', label: '내 프로필', hint: '아바타·관심사·후기' },
    }
  }
  return { hint: '아래에서 가던 길을 다시 골라보세요.' }
}

function SuggestionLink({ suggestion }: { suggestion: Suggestion }) {
  return (
    <Link to={suggestion.to} className={styles.suggestionCard}>
      <span className={styles.suggestionMark} aria-hidden="true">
        {suggestion.icon ? <Icon name={suggestion.icon} size={1.25} /> : suggestion.emoji}
      </span>
      <span className={styles.suggestionBody}>
        <strong>{suggestion.label}</strong>
        <small>{suggestion.hint}</small>
      </span>
      <Icon name="chevron-right" className={styles.suggestionChevron} aria-hidden="true" />
    </Link>
  )
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
    <main className={styles.page} aria-labelledby="notfound-title">
      <section className={styles.hero} aria-labelledby="notfound-title">
        <span className={styles.moon} aria-hidden="true">
          🌙
        </span>
        <p className={styles.kicker}>404 · 길 잃은 잔</p>
        <EnchantingTitle id="notfound-title" className={styles.title}>
          여기엔 아직 따라둔 잔이 없어요
        </EnchantingTitle>
        <p className={styles.hint}>{hint}</p>
        <p className={styles.path}>
          찾던 주소: <code>{pathname}</code>
        </p>
        <div className={styles.heroActions}>
          <Link to="/" className={styles.actionLink} aria-label="홈으로 돌아가기">
            <Button size="lg" leftIcon={<Icon name="home" />}>
              홈으로
            </Button>
          </Link>
          <Link to="/discover" className={styles.actionLink} aria-label="파티 둘러보기">
            <Button size="lg" variant="soft" leftIcon={<Icon name="compass" />}>
              둘러보기
            </Button>
          </Link>
          <Link to="/discover" className={styles.actionLink} aria-label="파티 검색하기">
            <Button size="lg" variant="ghost" leftIcon={<Icon name="search" />}>
              검색
            </Button>
          </Link>
        </div>
      </section>

      {cta && (
        <section className={styles.section} aria-labelledby="notfound-cta-heading">
          <h2 id="notfound-cta-heading" className={styles.sectionHeading}>
            혹시 이걸 찾으셨나요?
          </h2>
          <div className={styles.suggestionGrid}>
            <SuggestionLink suggestion={cta} />
          </div>
        </section>
      )}

      <section className={styles.section} aria-labelledby="notfound-popular-heading">
        <h2 id="notfound-popular-heading" className={styles.sectionHeading}>
          자주 가는 페이지
        </h2>
        <div className={styles.suggestionGrid}>
          {popularWithReturn.map((p) => (
            <SuggestionLink key={p.to} suggestion={p} />
          ))}
        </div>
      </section>

      {recentTop.length > 0 && (
        <section className={styles.section} aria-labelledby="notfound-recent-heading">
          <h2 id="notfound-recent-heading" className={styles.sectionHeading}>
            최근 본 모임
          </h2>
          <div className={styles.suggestionGrid}>
            {recentTop.map((r) => {
              const cat = CATEGORY_META[r.category as keyof typeof CATEGORY_META]
              return (
                <Link key={r.id} to={`/parties/${r.id}`} className={styles.suggestionCard}>
                  <span
                    className={styles.suggestionMark}
                    style={{ background: cat?.bgGradient }}
                    aria-hidden="true"
                  >
                    {cat?.emoji ?? '🍷'}
                  </span>
                  <span className={styles.suggestionBody}>
                    <strong>{r.title}</strong>
                    <small>{cat?.shortLabel ?? r.category}</small>
                  </span>
                  <Icon
                    name="chevron-right"
                    className={styles.suggestionChevron}
                    aria-hidden="true"
                  />
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
