import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useParties } from '@features/parties/queries'
import { PartyCard } from '@features/parties/PartyCard'
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

  const results = useMemo(() => {
    if (!data) return []
    const term = normalize(debounced)
    if (!term) return data.items
    return data.items.filter((p) => {
      const hay = [
        p.title,
        p.venueArea,
        p.venueName,
        ...(p.tags ?? []),
      ]
        .filter(Boolean)
        .map((s) => normalize(String(s)))
      return hay.some((field) => field.includes(term))
    })
  }, [data, debounced])

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

  const showSuggest = focused && (titleSuggestions.length > 0 || (input.trim().length === 0 && recents.length > 0))

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
                          onMouseDown={(e) => { e.preventDefault(); choose(r) }}
                        >
                          <span aria-hidden="true">🕒</span>
                          <span className={styles.suggestText}>{r}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.suggestForget}
                          aria-label={`${r} 검색 기록 삭제`}
                          onMouseDown={(e) => { e.preventDefault(); forget(r) }}
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
                          onMouseDown={(e) => { e.preventDefault(); choose(s.label) }}
                        >
                          <span aria-hidden="true">{s.kind === 'title' ? '🍷' : s.kind === 'area' ? '📍' : '#'}</span>
                          <span className={styles.suggestText}>{s.label}</span>
                          <span className={styles.suggestKind}>{s.kind === 'title' ? '모임' : s.kind === 'area' ? '지역' : '태그'}</span>
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
                <Chip
                  key={tag}
                  leadingEmoji="#"
                  onClick={() => setInput(tag)}
                >
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
