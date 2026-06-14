import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Button } from '@components/ui/Button/Button'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import styles from './Calendar.module.css'

import type { PartySummary } from '@rotifolk/shared'

import { CATEGORY_META } from '@/domains/categories/meta'
import { downloadIcs } from '@/domains/ics/buildIcs'
import { useMyParties } from '@/domains/parties/queries'

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000 // 종료 시각 정보가 없을 때 기본 2시간

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
const MAX_VISIBLE_PER_DAY = 2

interface DayCell {
  date: Date
  inMonth: boolean
  key: string
  parties: PartySummary[]
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildMonthGrid(year: number, month: number, parties: PartySummary[]): DayCell[] {
  const first = startOfMonth(year, month)
  const startWeekday = first.getDay()
  const gridStart = new Date(year, month, 1 - startWeekday)

  const byDay = new Map<string, PartySummary[]>()
  for (const party of parties) {
    const start = new Date(party.startAt)
    const key = dateKey(start)
    const bucket = byDay.get(key) ?? []
    bucket.push(party)
    byDay.set(key, bucket)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    const key = dateKey(d)
    cells.push({
      date: d,
      inMonth: d.getMonth() === month,
      key,
      parties: byDay.get(key) ?? [],
    })
  }
  // Trim trailing rows that contain only out-of-month days when fewer than 6 rows are needed.
  while (cells.length > 35 && cells.slice(-7).every((c) => !c.inMonth)) {
    cells.length -= 7
  }
  return cells
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const navigate = useNavigate()
  const { data, isLoading } = useMyParties()

  const parties = useMemo<PartySummary[]>(() => (data ?? []).map((row) => row.party), [data])

  // Agenda view: upcoming parties sorted chronologically, grouped by date
  const agendaGroups = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const upcoming = parties
      .filter((p) => new Date(p.startAt) >= todayStart)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

    const grouped = new Map<string, PartySummary[]>()
    for (const party of upcoming) {
      const key = dateKey(new Date(party.startAt))
      const bucket = grouped.get(key) ?? []
      bucket.push(party)
      grouped.set(key, bucket)
    }
    return Array.from(grouped.entries()).map(([key, list]) => ({ key, list }))
  }, [parties, today])

  const cells = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), parties),
    [cursor, parties]
  )

  const monthLabel = cursor.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  const goPrev = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  const goNext = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  if (isLoading) return <Loading />

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <div className={styles.headTitleBlock}>
          <p className={styles.kicker}>나의 캘린더</p>
          <h1 className={styles.monthTitle}>{monthLabel}</h1>
        </div>
        <div className={styles.headControls}>
          <button type="button" className={styles.navBtn} onClick={goPrev} aria-label="이전 달">
            ‹
          </button>
          <Button variant="soft" size="sm" onClick={goToday}>
            오늘
          </Button>
          {view === 'grid' ? (
            <Button variant="soft" size="sm" onClick={() => setView('list')}>
              📋 목록
            </Button>
          ) : (
            <Button variant="soft" size="sm" onClick={() => setView('grid')}>
              📅 그리드
            </Button>
          )}
          <button type="button" className={styles.navBtn} onClick={goNext} aria-label="다음 달">
            ›
          </button>
        </div>
      </header>

      {parties.length === 0 ? (
        <EmptyState
          emoji="🗓️"
          title="아직 신청한 파티가 없어요"
          description="모집 중인 파티에 참여하면 이 캘린더에 자동으로 표시됩니다."
          action={
            <Link to="/discover">
              <Button variant="primary">파티 둘러보기</Button>
            </Link>
          }
        />
      ) : view === 'list' ? (
        <div className={styles.agendaList}>
          {agendaGroups.length === 0 ? (
            <EmptyState
              emoji="🗓️"
              title="다가오는 파티가 없어요"
              description="신청한 파티가 모두 지나갔거나 아직 예정된 파티가 없어요."
              action={
                <Link to="/discover">
                  <Button variant="primary">파티 둘러보기</Button>
                </Link>
              }
            />
          ) : (
            agendaGroups.map(({ key, list }) => {
              const groupDate = new Date(key)
              const dateLabel = groupDate.toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })

              return (
                <div key={key} className={styles.agendaGroup}>
                  <p className={styles.agendaDateLabel}>{dateLabel}</p>
                  <div className={styles.agendaEvents}>
                    {list.map((party) => {
                      const meta = CATEGORY_META[party.category]
                      const start = new Date(party.startAt)
                      const timeLabel = start.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })

                      const handleDownload = () => {
                        const end = new Date(start.getTime() + DEFAULT_DURATION_MS)
                        downloadIcs({
                          uid: `${party.id}@rotifolk.app`,
                          title: party.title,
                          location: [party.venueName, party.venueArea].filter(Boolean).join(', '),
                          startAt: start,
                          endAt: end,
                        })
                      }

                      return (
                        <button
                          key={party.id}
                          type="button"
                          className={styles.agendaEvent}
                          onClick={() => navigate(`/parties/${party.id}`)}
                          aria-label={`${meta.shortLabel} · ${party.title}`}
                        >
                          <span className={styles.agendaEventEmoji} aria-hidden="true">
                            {meta.emoji}
                          </span>
                          <span className={styles.agendaEventBody}>
                            <span className={styles.agendaEventTitle}>{party.title}</span>
                            <span className={styles.agendaEventMeta}>{party.venueName}</span>
                          </span>
                          <span className={styles.agendaEventTime}>
                            {timeLabel}
                            <button
                              type="button"
                              className={styles.icsBtn}
                              style={{ position: 'static', opacity: 1, marginLeft: '6px' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload()
                              }}
                              aria-label={`${party.title} 캘린더에 저장 (ICS 다운로드)`}
                              title="캘린더에 저장 (.ics)"
                            >
                              <span aria-hidden="true">⤓</span>
                            </button>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        <>
          <div className={styles.weekHeader} role="presentation">
            {WEEKDAY_LABELS.map((label, idx) => (
              <span
                key={label}
                className={`${styles.weekLabel} ${idx === 0 ? styles.weekSun : ''} ${idx === 6 ? styles.weekSat : ''}`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className={styles.grid} role="grid" aria-label={`${monthLabel} 캘린더`}>
            {cells.map((cell) => {
              const weekday = cell.date.getDay()
              const isToday = isSameDay(cell.date, today)
              const visible = cell.parties.slice(0, MAX_VISIBLE_PER_DAY)
              const overflow = cell.parties.length - visible.length
              const firstParty = cell.parties[0]

              const handleDownload = (party: PartySummary) => {
                const start = new Date(party.startAt)
                const end = new Date(start.getTime() + DEFAULT_DURATION_MS)
                downloadIcs({
                  uid: `${party.id}@rotifolk.app`,
                  title: party.title,
                  location: [party.venueName, party.venueArea].filter(Boolean).join(', '),
                  startAt: start,
                  endAt: end,
                })
              }

              return (
                <div
                  key={cell.key}
                  role="gridcell"
                  className={[
                    styles.cell,
                    cell.inMonth ? '' : styles.cellMuted,
                    isToday ? styles.cellToday : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span
                    className={[
                      styles.dayNum,
                      weekday === 0 ? styles.daySun : '',
                      weekday === 6 ? styles.daySat : '',
                      isToday ? styles.dayNumToday : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {cell.date.getDate()}
                  </span>

                  {firstParty && (
                    <button
                      type="button"
                      className={styles.icsBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(firstParty)
                      }}
                      aria-label={`${firstParty.title} 캘린더에 저장 (ICS 다운로드)`}
                      title="캘린더에 저장 (.ics)"
                    >
                      <span aria-hidden="true">⤓</span>
                    </button>
                  )}

                  <div className={styles.events}>
                    {visible.map((party) => {
                      const meta = CATEGORY_META[party.category]
                      return (
                        <button
                          key={party.id}
                          type="button"
                          className={styles.event}
                          onClick={() => navigate(`/parties/${party.id}`)}
                          aria-label={`${meta.shortLabel} · ${party.title}`}
                          title={party.title}
                        >
                          <span className={styles.eventEmoji} aria-hidden="true">
                            {meta.emoji}
                          </span>
                          <span className={styles.eventTitle}>{truncate(party.title, 14)}</span>
                        </button>
                      )
                    })}
                    {overflow > 0 && (
                      <span className={styles.more} aria-label={`외 ${overflow}건 더`}>
                        +{overflow}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
