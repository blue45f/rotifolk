import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  describeParse,
  hourToTimeOfDay,
  parseSmartQuery,
  weekdayToDayPreference,
  type SmartSearchParse,
} from '@rotifolk/shared'
import { useParties } from '@features/parties/queries'
import { PartyCard } from '@features/parties/PartyCard'
import { CATEGORY_META } from '@features/categories/meta'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useRecentSearches } from '@features/search/useRecentSearches'
import styles from './Search.module.css'

const SUGGESTED_TAGS = ['와인', '한남', '5:5', '즉석', '무료'] as const

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [input, setInput] = useState(urlQuery)
  const [debounced, setDebounced] = useState(urlQuery)
  const [focused, setFocused] = useState(false)
  const { items: recents, remember, forget, clearAll } = useRecentSearches()
  const blurTimer = useRef<number | null>(null)

  useEffect(() => {
    if (urlQuery !== input) {
      setInput(urlQuery)
      setDebounced(urlQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery])

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(input)
      const next = new URLSearchParams(params)
      const trimmed = input.trim()
      if (trimmed) next.set('q', trimmed)
      else next.delete('q')
      setParams(next, { replace: true })
    }, 200)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  // remember a search 1.2s after it stops changing, so we don't store every keystroke
  useEffect(() => {
    const trimmed = debounced.trim()
    if (trimmed.length < 2) return
    const t = setTimeout(() => remember(trimmed), 1200)
    return () => clearTimeout(t)
  }, [debounced, remember])

  const { data, isLoading } = useParties({ status: 'open' })

  // 자연어 입력에서 정형 필터(카테고리·지역·포맷·성비·인원·시간대)를 추출.
  // 매칭되지 않은 잔여(q)는 기존 substring 검색으로 폴백 → 기존 검색을 깨지 않고 보강.
  const parsed = useMemo<SmartSearchParse>(() => parseSmartQuery(debounced), [debounced])

  const parsedChips = useMemo(
    () => describeParse(parsed, (c) => CATEGORY_META[c].shortLabel),
    [parsed],
  )

  const results = useMemo(() => {
    if (!data) return []
    const term = normalize(debounced)
    if (!term) return data.items

    const hasStructured =
      parsed.category != null ||
      parsed.area != null ||
      parsed.format != null ||
      parsed.capacity != null ||
      parsed.timeOfDay != null ||
      parsed.dayPreference != null

    // 기존(스마트 파싱 이전)의 plain substring 검색: 원문 전체를 제목/지역/장소/태그에 매칭.
    // 이 동작은 그대로 보존되어야 한다 — 스마트 파싱은 결과를 빼지 않고 더하기만 한다.
    const matchesSubstring = (p: (typeof data.items)[number]): boolean => {
      const hay = [p.title, p.venueArea, p.venueName, ...(p.tags ?? [])]
        .filter(Boolean)
        .map((s) => normalize(String(s)))
      return hay.some((field) => field.includes(term))
    }

    // 인식된 정형 필터(서로 AND). 정형 필터가 하나도 없으면 일치로 간주하지 않는다
    // (그 경우엔 substring 검색만으로 결정 → 기존 동작과 동일).
    const matchesStructured = (p: (typeof data.items)[number]): boolean => {
      if (!hasStructured) return false
      if (parsed.category != null && p.category !== parsed.category) return false
      if (parsed.area != null && !normalize(p.venueArea).includes(normalize(parsed.area)))
        return false
      if (parsed.format != null && p.format !== parsed.format) return false
      if (parsed.capacity != null && p.maxParticipants < parsed.capacity) return false
      if (parsed.timeOfDay != null || parsed.dayPreference != null) {
        const start = new Date(p.startAt)
        if (parsed.timeOfDay != null && hourToTimeOfDay(start.getHours()) !== parsed.timeOfDay)
          return false
        if (
          parsed.dayPreference != null &&
          weekdayToDayPreference(start.getDay()) !== parsed.dayPreference
        )
          return false
      }
      return true
    }

    // ADDITIVE: 정형 필터 일치 OR 기존 substring 일치 → 기존에 잡히던 파티를 절대 제외하지 않는다.
    return data.items.filter((p) => matchesStructured(p) || matchesSubstring(p))
  }, [data, debounced, parsed])

  const titleSuggestions = useMemo(() => {
    if (!data) return []
    const term = normalize(input)
    if (term.length < 1) return []
    const seen = new Set<string>()
    const out: { kind: 'title' | 'tag' | 'area'; label: string }[] = []
    for (const p of data.items) {
      if (out.length >= 6) break
      const fields: { kind: 'title' | 'tag' | 'area'; label: string }[] = [
        { kind: 'title', label: p.title },
        { kind: 'area', label: p.venueArea },
        ...(p.tags ?? []).map((t) => ({ kind: 'tag' as const, label: t })),
      ]
      for (const f of fields) {
        if (out.length >= 6) break
        const key = `${f.kind}:${f.label.toLowerCase()}`
        if (seen.has(key)) continue
        if (!normalize(f.label).includes(term)) continue
        if (normalize(f.label) === term) continue
        seen.add(key)
        out.push(f)
      }
    }
    return out
  }, [data, input])

  const trimmed = debounced.trim()
  const hasQuery = trimmed.length > 0

  const handleFocus = () => {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current)
      blurTimer.current = null
    }
    setFocused(true)
  }

  const handleBlur = () => {
    // delay so click on suggestion can register before we hide it
    blurTimer.current = window.setTimeout(() => setFocused(false), 150)
  }

  const choose = (term: string) => {
    setInput(term)
    setFocused(false)
    remember(term)
  }

  const showSuggest =
    focused && (titleSuggestions.length > 0 || (input.trim().length === 0 && recents.length > 0))

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <h1 className={styles.title}>파티 검색</h1>
        <div className={styles.searchBlock}>
          <Input
            type="search"
            autoFocus
            inputMode="search"
            placeholder="제목, 지역, 태그로 찾아보세요"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            leftIcon={<span aria-hidden="true">🔎</span>}
            aria-label="파티 검색"
            className={styles.searchField}
          />
          {showSuggest && (
            <div className={styles.suggestPanel} role="listbox" aria-label="검색 제안">
              {input.trim().length === 0 && recents.length > 0 && (
                <div className={styles.suggestGroup}>
                  <div className={styles.suggestGroupHead}>
                    <span>최근 검색</span>
                    <button type="button" className={styles.suggestClear} onClick={clearAll}>
                      전체 삭제
                    </button>
                  </div>
                  <ul>
                    {recents.map((r) => (
                      <li key={r} className={styles.suggestItem}>
                        <button
                          type="button"
                          className={styles.suggestRow}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            choose(r)
                          }}
                        >
                          <span aria-hidden="true">🕒</span>
                          <span className={styles.suggestText}>{r}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.suggestForget}
                          aria-label={`${r} 검색 기록 삭제`}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            forget(r)
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {titleSuggestions.length > 0 && (
                <div className={styles.suggestGroup}>
                  <div className={styles.suggestGroupHead}>
                    <span>이런 결과는 어때요?</span>
                  </div>
                  <ul>
                    {titleSuggestions.map((s, i) => (
                      <li key={`${s.kind}-${s.label}-${i}`} className={styles.suggestItem}>
                        <button
                          type="button"
                          className={styles.suggestRow}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            choose(s.label)
                          }}
                        >
                          <span aria-hidden="true">
                            {s.kind === 'title' ? '🍷' : s.kind === 'area' ? '📍' : '#'}
                          </span>
                          <span className={styles.suggestText}>{s.label}</span>
                          <span className={styles.suggestKind}>
                            {s.kind === 'title' ? '모임' : s.kind === 'area' ? '지역' : '태그'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <section className={`container ${styles.body}`}>
        {!hasQuery ? (
          <div className={styles.suggest}>
            <p className={styles.suggestLabel}>이런 키워드는 어때요?</p>
            <div className={styles.chipRow}>
              {SUGGESTED_TAGS.map((tag) => (
                <Chip key={tag} leadingEmoji="#" onClick={() => setInput(tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <Loading />
        ) : results.length === 0 ? (
          <EmptyState
            emoji="🔎"
            title={`'${trimmed}'에 맞는 파티가 없어요`}
            description="다른 키워드를 시도하거나, 추천 태그를 눌러보세요."
          />
        ) : (
          <>
            {parsedChips.length > 0 && (
              <div className={styles.parsedRow} aria-label="인식된 검색 필터">
                <span className={styles.parsedLabel}>인식한 조건</span>
                <div className={styles.chipRow}>
                  {/* 읽기 전용 정보 칩 — 클릭/포커스 불가한 비대화형 요소. */}
                  {parsedChips.map((c) => (
                    <span key={c.key} className={styles.parsedChip}>
                      {c.emoji != null && c.emoji !== '' && (
                        <span className={styles.parsedChipMark} aria-hidden="true">
                          {c.emoji}
                        </span>
                      )}
                      <span>{c.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className={styles.count}>
              <strong>{results.length}</strong>개의 결과
            </p>
            <div className={styles.grid}>
              {results.map((p) => (
                <PartyCard key={p.id} party={p} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
