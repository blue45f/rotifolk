/**
 * 새 소식(What's new) — ChangelogDesk 네이티브 연동.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 createChangelogClient(pk_) 로 게시된 변경 이력을 받아
 * 앱의 Sheet(바텀 시트/모달) + 디자인 토큰으로 렌더한다(외부 위젯 CSS·번들 없음).
 *
 * 헤더 액션에 "새 소식" 버튼으로 마운트되며, 미읽음이 있으면 점 배지를 표시한다.
 * VITE_CHANGELOGDESK_URL 미설정 시 버튼 자체가 렌더되지 않는다(앱 그대로 유지).
 *
 * 본문은 bodyMarkdown 을 HTML 주입 없이 React 노드로 렌더한다(MarkdownBlocks) —
 * 앱의 "HTML 미주입" 원칙을 따르고 외부 위젯 CSS 도 쓰지 않는다.
 */
import { Icon } from '@components/ui/Icon/Icon'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { MarkdownBlocks } from './markdownBlocks'
import styles from './WhatsNew.module.css'

import { getAnonId, getChangelogDesk } from '@/domains/deskcloud/clients'

interface Entry {
  id: string
  title: string
  bodyMarkdown: string
  tag: string
  version: string | null
  publishedAt: string | null
  createdAt: string
}

const TAG_LABELS: Record<string, string> = {
  new: '신규',
  improved: '개선',
  fixed: '수정',
  announcement: '공지',
}

function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function WhatsNew() {
  const client = useMemo(() => getChangelogDesk(), [])
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [entries, setEntries] = useState<Entry[]>([])
  const [unread, setUnread] = useState(0)

  // 미읽음 카운트 — 패널을 열지 않아도 배지를 갱신(1회).
  useEffect(() => {
    if (!client) return
    const ctrl = new AbortController()
    client
      .getUnreadCount({ anonId: getAnonId(), signal: ctrl.signal })
      .then((r) => setUnread(r.unreadCount))
      .catch(() => undefined)
    return () => ctrl.abort()
  }, [client])

  const load = useCallback(() => {
    if (!client) return
    setPhase('loading')
    client
      .getWall({ limit: 20 })
      .then((wall) => {
        const next = wall.items.map((e) => ({
          id: e.id,
          title: e.title,
          bodyMarkdown: e.bodyMarkdown,
          tag: e.tag,
          version: e.version,
          publishedAt: e.publishedAt,
          createdAt: e.createdAt,
        }))
        setEntries(next)
        setPhase('ready')
        // 패널을 연 시점에 최신 항목을 "봤다"고 기록 → 배지 0.
        const latest = next[0]
        client.markSeen({ anonId: getAnonId(), lastSeenEntryId: latest?.id }).catch(() => undefined)
        setUnread(0)
      })
      .catch(() => setPhase('error'))
  }, [client])

  const openPanel = useCallback(() => {
    setOpen(true)
    if (phase === 'idle' || phase === 'error') load()
  }, [phase, load])

  if (!client) return null

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={openPanel}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `새 소식, 읽지 않은 항목 ${unread}건` : '새 소식'}
      >
        <Icon name="sparkle" aria-hidden />
        <span className={styles.launcherText}>새 소식</span>
        {unread > 0 ? (
          <span className={styles.dot} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="새 소식"
        description="Rotifolk의 최근 업데이트와 변경 이력이에요."
        size="md"
      >
        {phase === 'loading' ? (
          <div className={styles.state} aria-busy="true">
            <span className={styles.spinner} aria-hidden="true" />
            <p>소식을 불러오는 중…</p>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className={styles.state} role="alert">
            <p className={styles.stateTitle}>불러오지 못했어요</p>
            <p>네트워크 상태를 확인하고 다시 시도해 주세요.</p>
            <button type="button" className={styles.retry} onClick={load}>
              다시 시도
            </button>
          </div>
        ) : null}

        {phase === 'ready' && entries.length === 0 ? (
          <div className={styles.state}>
            <p className={styles.stateTitle}>아직 소식이 없어요</p>
            <p>새로운 업데이트가 게시되면 여기에 표시됩니다.</p>
          </div>
        ) : null}

        {phase === 'ready' && entries.length > 0 ? (
          <ul className={styles.list}>
            {entries.map((entry) => {
              const date = formatDate(entry.publishedAt ?? entry.createdAt)
              return (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.entryTop}>
                    <span className={`${styles.tag} ${styles[`tag_${entry.tag}`] ?? ''}`}>
                      {tagLabel(entry.tag)}
                    </span>
                    {entry.version ? <span className={styles.ver}>{entry.version}</span> : null}
                    {date ? (
                      <time className={styles.date} dateTime={entry.publishedAt ?? entry.createdAt}>
                        {date}
                      </time>
                    ) : null}
                  </div>
                  <h3 className={styles.entryTitle}>{entry.title}</h3>
                  {entry.bodyMarkdown ? (
                    <MarkdownBlocks markdown={entry.bodyMarkdown} className={styles.md} />
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </Sheet>
    </>
  )
}

export default WhatsNew
