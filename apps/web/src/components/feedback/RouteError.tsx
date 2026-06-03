import { useRouteError, Link } from 'react-router-dom'
import { Button } from '@components/ui/Button/Button'

export default function RouteError() {
  const error = useRouteError() as { message?: string; status?: number } | null
  return (
    <div
      role="alert"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: 'calc(100dvh - var(--header-h))',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <div style={{ fontSize: '5rem', lineHeight: 1 }}>🍷</div>
        <h1 style={{ fontSize: 'var(--fs-3xl)', margin: 'var(--space-3) 0' }}>
          잠깐, 잔이 비었어요
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
          {error?.message ?? '문제가 발생했어요. 새로고침하거나 홈으로 돌아가 주세요.'}
        </p>
        <Link to="/">
          <Button variant="primary" size="lg">
            홈으로
          </Button>
        </Link>
      </div>
    </div>
  )
}
