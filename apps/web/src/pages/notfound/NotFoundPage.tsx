import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button/Button'

export default function NotFoundPage() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: 'calc(100dvh - var(--header-h) - var(--bottom-nav-h))',
        padding: 'var(--space-12)',
        textAlign: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: '6rem' }}>🌙</div>
        <h1
          style={{
            fontSize: 'var(--fs-3xl)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            margin: 'var(--space-3) 0 var(--space-2)',
          }}
        >
          여기엔 잔이 없어요
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
          요청한 페이지를 찾을 수 없었어요.
        </p>
        <Link to="/">
          <Button size="lg">홈으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  )
}
