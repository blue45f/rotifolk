import { Link } from 'react-router-dom'
import type { PartySummary } from '@rotifolk/shared'
import { Badge } from '@components/ui/Badge/Badge'
import { CATEGORY_META } from '@features/categories/meta'
import styles from './PartyCard.module.css'

interface Props {
  party: PartySummary
}

export function PartyCard({ party }: Props) {
  const cat = CATEGORY_META[party.category]
  const start = new Date(party.startAt)
  const isFull = party.currentParticipants >= party.maxParticipants
  const tones: Record<string, 'wine' | 'coffee' | 'tea' | 'whisky' | 'gold' | 'primary'> = {
    wine: 'wine',
    coffee: 'coffee',
    tea: 'tea',
    whisky: 'whisky',
    'natural-wine': 'gold',
  }
  const tone = tones[party.category] ?? 'primary'

  return (
    <Link to={`/parties/${party.id}`} className={styles.card}>
      <div className={styles.cover} style={{ background: cat.bgGradient }}>
        {party.coverImageUrl ? (
          <img src={party.coverImageUrl} alt="" className={styles.coverImg} />
        ) : (
          <div className={styles.coverEmoji} aria-hidden="true">
            {cat.emoji}
          </div>
        )}
        <div className={styles.coverOverlay} />
        <div className={styles.coverHead}>
          <Badge tone={tone} size="sm">
            {cat.emoji} {cat.shortLabel}
          </Badge>
          {isFull && (
            <Badge tone="danger" size="sm">
              마감 임박
            </Badge>
          )}
        </div>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{party.title}</h3>
        <div className={styles.meta}>
          <span>📍 {party.venueArea}</span>
          <span aria-hidden="true">·</span>
          <span>
            {start.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}{' '}
            {start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={styles.footer}>
          <span className={styles.people}>
            <strong>{party.currentParticipants}</strong> / {party.maxParticipants}명
          </span>
          <span className={styles.price}>{party.basePriceKRW.toLocaleString()}원</span>
        </div>
      </div>
    </Link>
  )
}

export default PartyCard
