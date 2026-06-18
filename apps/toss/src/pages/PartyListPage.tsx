import { Top } from '@toss/tds-mobile'
import { useMemo, useState } from 'react'

import { getParties, won, type Party } from '../lib/api'
import { navigate } from '../router'
import { theme, pageShell } from '../theme'
import { SearchBar, Chips, Badge, Cover } from '../ui'

const ALL = '전체'

export function PartyListPage() {
  const items = getParties()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(ALL)

  const cats = useMemo(() => {
    const c = new Map<string, number>()
    for (const p of items) c.set(p.categoryLabel, (c.get(p.categoryLabel) || 0) + 1)
    return [
      ALL,
      ...[...c.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)
        .slice(0, 7),
    ]
  }, [items])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return items.filter((p) => {
      const okC = cat === ALL || p.categoryLabel === cat
      const okQ =
        !query ||
        [p.title, p.description, p.venueName, p.area, ...(p.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      return okC && okQ
    })
  }, [items, q, cat])

  const open = (p: Party) => navigate(`/party/${encodeURIComponent(p.id)}`)

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      <Top
        title={<Top.TitleParagraph size={22}>🍷 로티포크</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            취향으로 만나는 라운드 로테이션 모임
          </Top.SubtitleParagraph>
        }
      />
      <div style={pageShell}>
        <div className="rise" style={{ marginBottom: 12 }}>
          <SearchBar value={q} onChange={setQ} placeholder="모임·장소·취향 검색" />
        </div>
        <div className="rise" style={{ animationDelay: '60ms', marginBottom: 18 }}>
          <Chips items={cats} active={cat} onPick={setCat} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p)}
              className="pressable rise"
              style={{
                animationDelay: `${90 + i * 25}ms`,
                width: '100%',
                textAlign: 'left',
                padding: 0,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius + 2,
                overflow: 'hidden',
                background: theme.surface,
                color: theme.text,
                cursor: 'pointer',
              }}
            >
              <Cover src={p.cover} alt={p.title} height={158} radius={0} seed={p.title} />
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
                  <Badge accent>{p.categoryLabel}</Badge>
                  {p.area && <Badge>{p.area}</Badge>}
                  {p.alcohol && <Badge>19+</Badge>}
                  {p.rating ? <Badge>★ {p.rating.toFixed(1)}</Badge> : null}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{p.title}</div>
                {p.venueName && (
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>
                    📍 {p.venueName}
                  </div>
                )}
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: theme.accent }}>
                    {won(p.basePriceKRW)}
                  </span>
                  {p.maxParticipants ? (
                    <span style={{ fontSize: 12.5, color: theme.textMuted }}>
                      · 최대 {p.maxParticipants}명
                    </span>
                  ) : null}
                  {p.totalRounds ? (
                    <span style={{ fontSize: 12.5, color: theme.textMuted }}>
                      · {p.totalRounds}라운드
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: theme.textMuted, padding: '40px 0' }}>
              ‘{q || cat}’ 결과가 없어요.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
