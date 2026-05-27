import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useParties } from '@features/parties/queries'
import { PartyCard } from '@features/parties/PartyCard'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
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

  const trimmed = debounced.trim()
  const hasQuery = trimmed.length > 0

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <h1 className={styles.title}>파티 검색</h1>
        <Input
          type="search"
          autoFocus
          inputMode="search"
          placeholder="제목, 지역, 태그로 찾아보세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          leftIcon={<span aria-hidden="true">🔎</span>}
          aria-label="파티 검색"
          className={styles.searchField}
        />
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
