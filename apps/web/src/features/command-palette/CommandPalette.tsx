import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { useAuthStore } from '@store/authStore'
import { useRecentSearches } from '@features/search/useRecentSearches'
import { useT } from '@features/i18n/useI18n'
import styles from './CommandPalette.module.css'

type UserRole = 'admin' | 'host' | 'participant' | null

type CommandGroupKey =
  | 'command.group.navigation'
  | 'command.group.account'
  | 'command.group.host'
  | 'command.group.admin'
  | 'command.group.search'
  | 'command.group.recent'
  | 'command.group.quickstart'

type CommandAction =
  | 'reopen-onboarding'
  | 'start-demo-login'
  | 'open-community-guide'
  | 'open-help-guide'
  | 'open-required-policies'

interface CommandItemBase {
  id: string
  emoji: string
  label: string
  hint: string
  groupKey: CommandGroupKey
}

interface CommandNavigationItem extends CommandItemBase {
  kind: 'navigation'
  path: string
}

interface CommandActionItem extends CommandItemBase {
  kind: 'action'
  action: CommandAction
}

type CommandItem = CommandNavigationItem | CommandActionItem

interface CommandSection {
  key: string
  heading: string
  items: CommandItem[]
}

interface CommandPaletteProps {
  onClose: () => void
  onRestartOnboarding: () => void
}

interface CommandSeedBase {
  id: string
  labelKey: string
  labelFallback: string
  emoji: string
  groupKey: CommandGroupKey
  visible: 'public' | 'auth' | 'host' | 'admin' | 'participant'
}

interface NavigationSeed extends CommandSeedBase {
  kind: 'navigation'
  path: string
}

interface ActionSeed extends CommandSeedBase {
  kind: 'action'
  action: CommandAction
}

type CommandSeed = NavigationSeed | ActionSeed

const COMMAND_SEEDS: CommandSeed[] = [
  {
    id: 'home',
    kind: 'navigation',
    path: '/',
    labelKey: 'nav.home',
    labelFallback: '홈',
    emoji: '🏠',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'discover',
    kind: 'navigation',
    path: '/discover',
    labelKey: 'nav.discover',
    labelFallback: '파티 탐색',
    emoji: '🔎',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'venues',
    kind: 'navigation',
    path: '/venues',
    labelKey: 'nav.venues',
    labelFallback: '장소',
    emoji: '📍',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'community',
    kind: 'navigation',
    path: '/community',
    labelKey: 'nav.community',
    labelFallback: '커뮤니티',
    emoji: '💬',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'neighborhood',
    kind: 'navigation',
    path: '/neighborhood',
    labelKey: 'nav.neighborhood',
    labelFallback: '내 동네',
    emoji: '🗺️',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'quick',
    kind: 'navigation',
    path: '/quick',
    labelKey: 'nav.quick',
    labelFallback: '즉석',
    emoji: '⚡',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'search',
    kind: 'navigation',
    path: '/search',
    labelKey: 'nav.search',
    labelFallback: '검색',
    emoji: '🧭',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'help',
    kind: 'navigation',
    path: '/help',
    labelKey: 'nav.help',
    labelFallback: '도움말',
    emoji: '💡',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'tutorial',
    kind: 'navigation',
    path: '/tutorial',
    labelKey: 'nav.tutorial',
    labelFallback: '튜토리얼',
    emoji: '🧭',
    groupKey: 'command.group.quickstart',
    visible: 'public',
  },
  {
    id: 'policies',
    kind: 'navigation',
    path: '/policies',
    labelKey: 'nav.policies',
    labelFallback: '정책',
    emoji: '📜',
    groupKey: 'command.group.navigation',
    visible: 'public',
  },
  {
    id: 'chats',
    kind: 'navigation',
    path: '/chats',
    labelKey: 'nav.chats',
    labelFallback: '채팅',
    emoji: '💌',
    groupKey: 'command.group.account',
    visible: 'auth',
  },
  {
    id: 'me',
    kind: 'navigation',
    path: '/me',
    labelKey: 'nav.me',
    labelFallback: '내 프로필',
    emoji: '👤',
    groupKey: 'command.group.account',
    visible: 'auth',
  },
  {
    id: 'notifications',
    kind: 'navigation',
    path: '/notifications',
    labelKey: 'nav.notifications',
    labelFallback: '알림',
    emoji: '🔔',
    groupKey: 'command.group.account',
    visible: 'auth',
  },
  {
    id: 'calendar',
    kind: 'navigation',
    path: '/calendar',
    labelKey: 'nav.calendar',
    labelFallback: '캘린더',
    emoji: '🗓️',
    groupKey: 'command.group.account',
    visible: 'auth',
  },
  {
    id: 'host',
    kind: 'navigation',
    path: '/host',
    labelKey: 'nav.host',
    labelFallback: '호스트 콘솔',
    emoji: '🎙️',
    groupKey: 'command.group.host',
    visible: 'host',
  },
  {
    id: 'become-host',
    kind: 'navigation',
    path: '/become-host',
    labelKey: 'nav.hostApply',
    labelFallback: '호스트 시작',
    emoji: '🚀',
    groupKey: 'command.group.host',
    visible: 'participant',
  },
  {
    id: 'admin',
    kind: 'navigation',
    path: '/admin',
    labelKey: 'nav.admin',
    labelFallback: '관리자',
    emoji: '🛡️',
    groupKey: 'command.group.admin',
    visible: 'admin',
  },
  {
    id: 'restart-onboarding',
    kind: 'action',
    action: 'reopen-onboarding',
    labelKey: 'command.quick.onboarding',
    labelFallback: '튜토리얼 다시 보기',
    emoji: '🎬',
    groupKey: 'command.group.quickstart',
    visible: 'public',
  },
  {
    id: 'start-demo-login',
    kind: 'action',
    action: 'start-demo-login',
    labelKey: 'command.quick.demoLogin',
    labelFallback: '데모 계정 바로 시작',
    emoji: '🎁',
    groupKey: 'command.group.quickstart',
    visible: 'public',
  },
  {
    id: 'help-guide',
    kind: 'action',
    action: 'open-help-guide',
    labelKey: 'command.quick.helpGuide',
    labelFallback: '도움말 8단계 가이드',
    emoji: '📚',
    groupKey: 'command.group.quickstart',
    visible: 'public',
  },
  {
    id: 'community-guide',
    kind: 'action',
    action: 'open-community-guide',
    labelKey: 'command.quick.communityGuide',
    labelFallback: '커뮤니티 시작 가이드',
    emoji: '🚀',
    groupKey: 'command.group.quickstart',
    visible: 'public',
  },
  {
    id: 'policies-guide',
    kind: 'action',
    action: 'open-required-policies',
    labelKey: 'command.quick.policiesGuide',
    labelFallback: '필수 정책 바로 보기',
    emoji: '📜',
    groupKey: 'command.group.quickstart',
    visible: 'public',
  },
]

const SECTION_ORDER: Array<CommandSeed['groupKey']> = [
  'command.group.quickstart',
  'command.group.search',
  'command.group.navigation',
  'command.group.account',
  'command.group.host',
  'command.group.admin',
  'command.group.recent',
]

function visibleSeed(seed: CommandSeed, role: UserRole): boolean {
  if (seed.visible === 'public') return true
  if (seed.visible === 'participant') return role === null || role === 'participant'
  if (seed.visible === 'auth') return role !== null
  if (seed.visible === 'host') return role === 'host' || role === 'admin'
  if (seed.visible === 'admin') return role === 'admin'
  return false
}

function toSearchPath(term: string) {
  return `/search?q=${encodeURIComponent(term.trim())}`
}

function enrichNavigationPath(path: string, fromQuery: string) {
  if (path === '/community') return `/community?from=${fromQuery}`
  if (path === '/help') return `/help?from=${fromQuery}`
  if (path === '/tutorial') return `/tutorial?from=${fromQuery}`
  if (path === '/policies') return `/policies?from=${fromQuery}`
  return path
}

export default function CommandPalette({ onClose, onRestartOnboarding }: CommandPaletteProps) {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const { items: recentSearches, clearAll } = useRecentSearches()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const role = user?.role ?? null
  const from = `${location.pathname}${location.search}${location.hash}`
  const fromQuery = encodeURIComponent(from || '/')

  const groupedCommands = useMemo<CommandSection[]>(() => {
    const q = query.trim().toLowerCase()

    const navItems: CommandNavigationItem[] = COMMAND_SEEDS.filter(
      (seed): seed is NavigationSeed => seed.kind === 'navigation' && visibleSeed(seed, role),
    )
      .map(
        (seed): CommandNavigationItem => ({
          id: seed.id,
          kind: 'navigation' as const,
          path: enrichNavigationPath(seed.path, fromQuery),
          emoji: seed.emoji,
          label: t(seed.labelKey) ?? seed.labelFallback,
          hint: t(seed.groupKey),
          groupKey: seed.groupKey,
        }),
      )
      .filter((item) => {
        return !q || item.label.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
      })

    const actionItems: CommandActionItem[] = COMMAND_SEEDS.filter(
      (seed): seed is ActionSeed => seed.kind === 'action' && visibleSeed(seed, role),
    )
      .map(
        (seed): CommandActionItem => ({
          id: seed.id,
          kind: 'action' as const,
          action: seed.action,
          emoji: seed.emoji,
          label: t(seed.labelKey) ?? seed.labelFallback,
          hint: t(seed.groupKey),
          groupKey: seed.groupKey,
        }),
      )
      .filter((item) => !q || item.label.toLowerCase().includes(q))

    const recentItems: CommandNavigationItem[] = (
      q ? recentSearches.filter((term) => term.toLowerCase().includes(q)) : recentSearches
    )
      .slice(0, 6)
      .map(
        (term, index): CommandNavigationItem => ({
          id: `recent-${index}-${term}`,
          kind: 'navigation',
          path: toSearchPath(term),
          emoji: '🧠',
          label: term,
          hint: t('command.group.recent'),
          groupKey: 'command.group.recent',
        }),
      )

    const queryItems: CommandNavigationItem[] = q
      ? [
          {
            id: 'search-query',
            kind: 'navigation',
            path: toSearchPath(q),
            emoji: '🔎',
            label: `${t('command.searchFor')}: ${q}`,
            hint: t('command.group.search'),
            groupKey: 'command.group.search',
          },
        ]
      : []

    const buckets = new Map<string, CommandItem[]>()

    for (const item of [...queryItems, ...actionItems, ...navItems, ...recentItems]) {
      const list = buckets.get(item.groupKey) || []
      list.push(item)
      buckets.set(item.groupKey, list)
    }

    return SECTION_ORDER.map((key) => ({
      key,
      heading: t(key),
      items: buckets.get(key) || [],
    })).filter((section) => section.items.length > 0)
  }, [query, role, recentSearches, fromQuery, t])

  const flat = useMemo(() => groupedCommands.flatMap((section) => section.items), [groupedCommands])
  const activeId = flat[activeIndex]?.id

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setActiveIndex(flat.length > 0 ? 0 : -1)
    })
    return () => {
      cancelled = true
    }
  }, [flat])

  function runAction(action: CommandAction) {
    if (action === 'reopen-onboarding') {
      onRestartOnboarding()
      return
    }

    if (action === 'start-demo-login') {
      navigate(`/login?demo=1&auto=1&from=${fromQuery}&fromTutorial=demo`)
      return
    }

    if (action === 'open-help-guide') {
      navigate(`/help?from=${fromQuery}&fromTutorial=help`)
      return
    }

    if (action === 'open-community-guide') {
      navigate(
        `/community?guide=1&category=question&template=first-question&fromTutorial=community&from=${fromQuery}`,
      )
      return
    }

    if (action === 'open-required-policies') {
      navigate(`/policies?filter=required&from=${fromQuery}&fromTutorial=policies`)
      return
    }
  }

  function go(item: CommandItem) {
    onClose()
    if (item.kind === 'action') {
      runAction(item.action)
      return
    }

    navigate(item.path)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(flat.length ? Math.min(activeIndex + 1, flat.length - 1) : -1)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(flat.length ? (activeIndex <= 0 ? flat.length - 1 : activeIndex - 1) : -1)
      return
    }

    if (e.key === 'Home' && flat.length > 0) {
      e.preventDefault()
      setActiveIndex(0)
      return
    }

    if (e.key === 'End' && flat.length > 0) {
      e.preventDefault()
      setActiveIndex(flat.length - 1)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[activeIndex]) {
        go(flat[activeIndex]!)
        return
      }

      if (query.trim()) {
        go({
          id: 'search-query-fallback',
          kind: 'navigation',
          path: toSearchPath(query),
          emoji: '🔎',
          label: `${t('command.searchFor')}: ${query.trim()}`,
          hint: t('command.group.search'),
          groupKey: 'command.group.search',
        })
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
  }

  return (
    <Sheet open={true} onClose={onClose} title={t('command.title')} size="md" variant="modal">
      <div className={styles.palette}>
        <input
          type="search"
          autoFocus
          className={styles.input}
          placeholder={t('command.placeholder')}
          aria-label={t('command.title')}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-listbox"
          aria-activedescendant={activeId}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onKeyDown}
        />

        <div className={styles.result}>
          {flat.length === 0 && <p className={styles.empty}>{t('command.empty')}</p>}
          {flat.length > 0 && (
            <ul
              id="command-listbox"
              role="listbox"
              aria-label={t('command.title')}
              className={styles.list}
            >
              {(() => {
                let index = -1
                return groupedCommands.flatMap((section) => {
                  const rows = [
                    <li key={`${section.key}-label`} className={styles.groupLabel}>
                      <span>{section.heading}</span>
                      {section.key === 'command.group.recent' ? (
                        <button type="button" className={styles.clear} onClick={clearAll}>
                          {t('btn.clear')}
                        </button>
                      ) : null}
                    </li>,
                  ]

                  for (const item of section.items) {
                    index += 1
                    const isActive = activeIndex === index
                    rows.push(
                      <li key={item.id}>
                        <button
                          type="button"
                          role="option"
                          id={item.id}
                          aria-selected={isActive}
                          className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                          onMouseMove={() => setActiveIndex(index)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => go(item)}
                        >
                          <span aria-hidden="true">{item.emoji}</span>
                          <span className={styles.label}>{item.label}</span>
                          <span className={styles.hint}>{item.hint}</span>
                        </button>
                      </li>,
                    )
                  }

                  return rows
                })
              })()}
            </ul>
          )}
        </div>

        <p className={styles.footer}>
          <span>
            <span className={styles.kbd}>↑/↓</span> {t('command.hints.navigate')}
          </span>
          <span>
            <span className={styles.kbd}>↵</span> {t('command.hints.select')}
          </span>
          <span>
            <span className={styles.kbd}>esc</span> {t('command.hints.close')}
          </span>
        </p>
      </div>
    </Sheet>
  )
}
