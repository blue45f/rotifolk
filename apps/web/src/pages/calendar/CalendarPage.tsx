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

function buildIcsRequest(party: PartySummary) {
  const start = new Date(party.startAt)
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS)
  return {
    uid: `${party.id}@rotifolk.app`,
    title: party.title,
    location: [party.venueName, party.venueArea].filter(Boolean).join(', '),
    startAt: start,
    endAt: end,
  }
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedKey, setSelectedKey] = useState<string>(() => dateKey(today))
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
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedKey(dateKey(today))
  }

  // Keyboard date navigation within the month grid (arrow keys / home / end).
  const moveSelection = (current: Date, days: number) => {
    const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + days)
    setSelectedKey(dateKey(next))
    // Follow the selection into an adjacent month if it crosses the boundary.
    if (next.getMonth() !== cursor.getMonth() || next.getFullYear() !== cursor.getFullYear()) {
      setCursor(new Date(next.getFullYear(), next.getMonth(), 1))
    }
  }

  const onCellKeyDown = (e: React.KeyboardEvent, date: Date) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault()
        moveSelection(date, -1)
        break
      case 'ArrowRight':
        e.preventDefault()
        moveSelection(date, 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        moveSelection(date, -7)
        break
      case 'ArrowDown':
        e.preventDefault()
        moveSelection(date, 7)
        break
      case 'Home':
        e.preventDefault()
        moveSelection(date, -date.getDay())
        break
      case 'End':
        e.preventDefault()
        moveSelection(date, 6 - date.getDay())
        break
      default:
        break
    }
  }

  if (isLoading) return <Loading />

  const renderEventRow = (party: PartySummary) => {
    const meta = CATEGORY_META[party.category]
    const start = new Date(party.startAt)
    const timeLabel = start.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    return (
      <li
        key={party.id}
        className={styles.eventRow}
        style={{ '--cat-accent': meta.accentHex } as React.CSSProperties}
      >
        <button
          type="button"
          className={styles.eventRowMain}
          onClick={() => navigate(`/parties/${party.id}`)}
          aria-label={`${meta.shortLabel} · ${party.title} · ${timeLabel}`}
        >
          <span className={styles.eventRowEmoji} aria-hidden="true">
            {meta.emoji}
          </span>
          <span className={styles.eventRowBody}>
            <span className={styles.eventRowTitle}>{party.title}</span>
            <span className={styles.eventRowMeta}>
              <Icon name="clock" size={0.95} aria-hidden="true" />
              <span className={styles.eventRowTime}>{timeLabel}</span>
              {party.venueName && (
                <>
                  <span className={styles.eventRowDot} aria-hidden="true" />
                  <Icon name="pin" size={0.95} aria-hidden="true" />
                  <span className={styles.eventRowVenue}>{party.venueName}</span>
                </>
              )}
            </span>
          </span>
          <Icon
            name="chevron-right"
            size={1}
            className={styles.eventRowChevron}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className={styles.icsBtn}
          onClick={() => downloadIcs(buildIcsRequest(party))}
          aria-label={`${party.title} 캘린더에 저장 (ICS 다운로드)`}
          title="캘린더에 저장 (.ics)"
        >
          <Icon name="bookmark" size={1} aria-hidden="true" />
        </button>
      </li>
    )
  }

  const selectedDateLabel = selectedCell
    ? selectedCell.date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    : ''
  const selectedIsToday = selectedCell ? isSameDay(selectedCell.date, today) : false

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <div className={styles.headTitleBlock}>
          <p className={styles.kicker}>나의 캘린더</p>
          <h1 className={styles.monthTitle}>{monthLabel}</h1>
        </div>
        <div className={styles.headControls}>
          <div className={styles.monthNav} role="group" aria-label="월 이동">
            <button type="button" className={styles.navBtn} onClick={goPrev} aria-label="이전 달">
              <Icon
                name="chevron-right"
                size={1.15}
                className={styles.navIconPrev}
                aria-hidden="true"
              />
            </button>
            <Button variant="soft" size="sm" onClick={goToday}>
              오늘
            </Button>
            <button type="button" className={styles.navBtn} onClick={goNext} aria-label="다음 달">
              <Icon name="chevron-right" size={1.15} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.viewToggle} role="group" aria-label="보기 전환">
            <button
              type="button"
              className={styles.viewBtn}
              data-active={view === 'grid'}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              월
            </button>
            <button
              type="button"
              className={styles.viewBtn}
              data-active={view === 'list'}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              일정
            </button>
          </div>
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
              const isTodayGroup = isSameDay(groupDate, today)

              return (
                <section key={key} className={styles.agendaGroup} aria-label={dateLabel}>
                  <p className={styles.agendaDateLabel}>
                    <span>{dateLabel}</span>
                    {isTodayGroup && <span className={styles.todayPill}>오늘</span>}
                  </p>
                  <ul className={styles.eventRows}>{list.map(renderEventRow)}</ul>
                </section>
              )
            })
          )}
        </div>
      ) : (
        <div className={styles.monthLayout}>
          <div>
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
                const isSelected = cell.key === selectedKey
                const visible = cell.parties.slice(0, MAX_VISIBLE_PER_DAY)
                const overflow = cell.parties.length - visible.length
                const hasEvents = cell.parties.length > 0

                return (
                  <button
                    type="button"
                    key={cell.key}
                    role="gridcell"
                    tabIndex={isSelected ? 0 : -1}
                    aria-selected={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${cell.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}${hasEvents ? `, 파티 ${cell.parties.length}건` : ', 일정 없음'}`}
                    className={[
                      styles.cell,
                      cell.inMonth ? '' : styles.cellMuted,
                      isToday ? styles.cellToday : '',
                      isSelected ? styles.cellSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedKey(cell.key)}
                    onKeyDown={(e) => onCellKeyDown(e, cell.date)}
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

                    <span className={styles.events} aria-hidden="true">
                      {visible.map((party) => {
                        const meta = CATEGORY_META[party.category]
                        return (
                          <span
                            key={party.id}
                            className={styles.event}
                            style={{ '--cat-accent': meta.accentHex } as React.CSSProperties}
                            title={party.title}
                          >
                            <span className={styles.eventEmoji}>{meta.emoji}</span>
                            <span className={styles.eventTitle}>{truncate(party.title, 14)}</span>
                          </span>
                        )
                      })}
                      {overflow > 0 && <span className={styles.more}>+{overflow}</span>}
                    </span>
                    {hasEvents && (
                      <span className={styles.cellDot} aria-hidden="true">
                        <span className={styles.cellDotInner} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <section className={styles.dayPanel} aria-label={`${selectedDateLabel} 일정`}>
            <header className={styles.dayPanelHead}>
              <h2 className={styles.dayPanelTitle}>{selectedDateLabel}</h2>
              {selectedIsToday && <span className={styles.todayPill}>오늘</span>}
            </header>
            {selectedCell && selectedCell.parties.length > 0 ? (
              <ul className={styles.eventRows}>{selectedCell.parties.map(renderEventRow)}</ul>
            ) : (
              <div className={styles.dayPanelEmpty}>
                <span className={styles.dayPanelEmptyEmoji} aria-hidden="true">
                  🌿
                </span>
                <p className={styles.dayPanelEmptyText}>이 날에는 예정된 파티가 없어요.</p>
                <Link to="/discover" className={styles.dayPanelEmptyLink}>
                  <Button variant="soft" size="sm">
                    파티 둘러보기
                  </Button>
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
