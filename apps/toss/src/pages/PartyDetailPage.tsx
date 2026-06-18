import { Button } from '@toss/tds-mobile'
import { useEffect, useState } from 'react'

import { getParty, won } from '../lib/api'
import { shareMessage } from '../lib/toss'
import { navigate } from '../router'
import { theme } from '../theme'
import { Badge, Cover, StatStrip } from '../ui'

export function PartyDetailPage({ id = '' }: { id?: string }) {
  const p = getParty(id)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const x = window.setTimeout(() => setToast(null), 2000)
    return () => window.clearTimeout(x)
  }, [toast])

  const Header = (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 56,
        padding: '0 8px',
        paddingTop: 'env(safe-area-inset-top)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: `color-mix(in oklab, ${theme.bg} 84%, transparent)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <button
        type="button"
        aria-label="뒤로"
        onClick={() => navigate('/')}
        className="pressable"
        style={{
          width: 44,
          height: 44,
          background: 'none',
          border: 'none',
          color: theme.text,
          fontSize: 24,
          cursor: 'pointer',
        }}
      >
        ←
      </button>
    </header>
  )
  if (!p)
    return (
      <div style={{ background: theme.bg, minHeight: '100dvh' }}>
        {Header}
        <p style={{ textAlign: 'center', color: theme.textMuted, paddingTop: 40 }}>
          모임을 찾을 수 없어요.
        </p>
      </div>
    )

  const share = async () => {
    const r = await shareMessage(`[로티포크] ${p.title}\n${p.description}`)
    if (r === 'clipboard') setToast('클립보드에 복사했어요.')
  }
  const stats = [
    p.basePriceKRW ? { label: '참가비', value: won(p.basePriceKRW) } : null,
    p.maxParticipants ? { label: '정원', value: p.maxParticipants + '명' } : null,
    p.totalRounds ? { label: '라운드', value: p.totalRounds + '회' } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      {Header}
      <div className="rise" style={{ padding: '0 0 110px' }}>
        <div style={{ padding: '0 16px' }}>
          <Cover src={p.cover} alt={p.title} height={210} radius={16} seed={p.title} />
        </div>
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <Badge accent>{p.categoryLabel}</Badge>
            {p.area && <Badge>{p.area}</Badge>}
            {p.alcohol && <Badge>19+</Badge>}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.32 }}>{p.title}</h1>
          {p.venueName && (
            <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
              📍 {p.venueName} {p.rating ? `· ★ ${p.rating.toFixed(1)}` : ''}
            </p>
          )}

          {stats.length ? (
            <div style={{ marginTop: 18 }}>
              <StatStrip stats={stats} />
            </div>
          ) : null}

          {p.description && (
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.78,
                color: theme.text,
                margin: '20px 0 0',
                maxWidth: '72ch',
              }}
            >
              {p.description}
            </p>
          )}

          {p.tags?.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
              {p.tags.map((t) => (
                <Badge key={t}>{t.startsWith('#') ? t : '#' + t}</Badge>
              ))}
            </div>
          ) : null}

          {p.alcohol && (
            <p style={{ marginTop: 18, fontSize: 12.5, color: theme.textMuted, lineHeight: 1.6 }}>
              ※ 주류가 제공되는 모임으로 만 19세 이상만 참여할 수 있어요.
            </p>
          )}

          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={share}
              className="pressable"
              style={{
                width: '100%',
                minHeight: 52,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                background: 'transparent',
                color: theme.text,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              공유하기
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
          background: `linear-gradient(to top, ${theme.bg} 72%, transparent)`,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{won(p.basePriceKRW)}</div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>참가비</div>
        </div>
        <Button
          style={{ flex: 1 }}
          onClick={() => setToast('참여 신청은 토스 심사 후 인앱결제로 연결돼요.')}
        >
          참여 신청
        </Button>
      </div>
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(88px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.86)',
            color: theme.text,
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13.5,
            maxWidth: '90%',
            textAlign: 'center',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
