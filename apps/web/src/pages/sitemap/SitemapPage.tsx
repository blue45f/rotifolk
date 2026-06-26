import EnchantingTitle from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Link } from 'react-router-dom'

import { usePageMeta } from '@/hooks/usePageMeta'

const routes = [
  '/',
  '/discover',
  '/category/:value',
  '/vibe',
  '/community',
  '/clubs',
  '/clubs/new',
  '/clubs/:clubId',
  '/support',
  '/help/host',
  '/help/guest',
  '/neighborhood',
  '/quick',
  '/parties/:partyId',
  '/venues',
  '/help',
  '/tutorial',
  '/policies',
  '/terms',
  '/privacy',
  '/cancel-policy',
  '/safety',
  '/hosts/:hostId',
  '/match-card/:userId',
  '/me/cards',
  '/me/follows',
  '/me/saved',
  '/me/payments',
  '/me/blocks',
  '/me/notes',
  '/me/profile-studio',
  '/login',
  '/signup',
  '/host',
  '/host/create',
  '/host/sourcing',
  '/host/space',
  '/host/venues/new',
  '/host/parties/:partyId',
  '/live/:partyId',
  '/parties/:partyId/reveal',
  '/me',
  '/chats',
  '/chats/:roomId',
  '/notifications',
  '/search',
  '/invite/:code',
  '/digest',
  '/become-host',
  '/calendar',
  '/admin',
  '/admin/moderation',
  '/design',
] as const

function labelFor(route: string) {
  if (route === '/') return '홈'
  if (route === '/design') return '디자인 시스템'
  return route.replace(/^\//, '').replaceAll('/', ' / ').replaceAll(':', '').replaceAll('-', ' ')
}

export default function SitemapPage() {
  usePageMeta({
    title: '사이트맵',
    description: 'rotifolk 전체 경로와 디자인 시스템 진입점을 모아둔 페이지입니다.',
    path: '/sitemap',
  })

  return (
    <main className="container" style={{ paddingBlock: 'var(--space-10)' }}>
      <section
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <p
          style={{
            color: 'var(--color-primary)',
            fontSize: 'var(--fs-xs)',
            fontWeight: 'var(--fw-black)',
            letterSpacing: '0.08em',
          }}
        >
          BETA Sitemap
        </p>
        <EnchantingTitle style={{ marginTop: 'var(--space-2)' }} as="h1">
          rotifolk 사이트맵
        </EnchantingTitle>
        <p style={{ maxWidth: '64ch', color: 'var(--color-text-muted)' }}>
          탐색, 모임, 호스트 콘솔, 계정, 정책, 디자인 시스템 경로를 한 화면에 정리했습니다.
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {routes.map((route) => (
          <Link
            key={route}
            to={route}
            style={{
              display: 'grid',
              minHeight: '7rem',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <strong>{labelFor(route)}</strong>
            <code style={{ color: 'var(--color-text-muted)', overflowWrap: 'anywhere' }}>
              {route}
            </code>
          </Link>
        ))}
      </div>
    </main>
  )
}
