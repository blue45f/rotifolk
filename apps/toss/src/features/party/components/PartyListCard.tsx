import { memo } from 'react'

import { theme } from '@/theme'
import type { PartyListItem } from '@/entities/party/party'

interface Props {
  party: PartyListItem
  onOpen: (id: string) => void
  isBookmarked: boolean
  onToggleBookmark: (id: string, title: string) => void
  index: number
}

export const PartyListCard = memo(function PartyListCard({
  party,
  onOpen,
  isBookmarked,
  onToggleBookmark,
  index,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(party.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(party.id)
        }
      }}
      className="pressable rise"
      style={{
        animationDelay: `${90 + index * 16}ms`,
        width: '100%',
        textAlign: 'left',
        padding: 0,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius + 2,
        overflow: 'hidden',
        background: theme.surface,
        color: theme.text,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <img
        src={party.cover ?? undefined}
        alt={party.title}
        loading="lazy"
        style={{
          width: '100%',
          height: 170,
          objectFit: 'cover',
          background: theme.surfaceAlt,
          display: 'block',
        }}
      />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleBookmark(party.id, party.title)
        }}
        aria-label={isBookmarked ? '찜 해제' : '찜 하기'}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 34,
          height: 34,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.24)',
          background: 'rgba(16,16,16,0.5)',
          backdropFilter: 'blur(8px)',
          color: isBookmarked ? '#ffb347' : theme.text,
          fontSize: 14,
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        ☆
      </button>
      <div style={{ padding: '12px 14px 14px' }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 22,
              padding: '0 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
              color: theme.text,
              background: party.isAlcohol ? 'rgba(255,179,71,0.2)' : 'rgba(255,255,255,0.12)',
            }}
          >
            {party.categoryLabel}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 22,
              padding: '0 8px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
              color: theme.textMuted,
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            {party.livePulseLabel}
          </span>
          {party.currentParticipants >= party.maxParticipants ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 22,
                padding: '0 8px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                color: theme.text,
                background: 'rgba(255,255,255,0.12)',
              }}
            >
              마감
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.34 }}>{party.title}</div>
        <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>
          📍 {party.venueName} {party.venueArea && <span>· {party.venueArea}</span>}
        </div>
        <div style={{ marginTop: 9, fontSize: 12.5, color: theme.textMuted }}>
          {party.sanitizedDescription}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: theme.accent }}>
            {party.basePriceKRW.toLocaleString()}원
          </span>
          <span style={{ fontSize: 12, color: theme.textMuted }}>
            · 정원 {party.maxParticipants}명
          </span>
          {party.totalRounds ? (
            <span style={{ fontSize: 12, color: theme.textMuted }}>
              · {party.totalRounds}라운드
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
})
