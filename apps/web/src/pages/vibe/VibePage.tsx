import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import EnchantingTitle from '@components/ui/EnchantingTitle/EnchantingTitle'
import { Icon } from '@components/ui/Icon/Icon'
import { recommendParties } from '@rotifolk/shared'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './Vibe.module.css'

import { PartyCard } from '@/domains/parties/PartyCard'
import { useParties } from '@/domains/parties/queries'

const SUGGESTIONS = [
  '조용한 와인 한잔, 깊은 대화 좋아해요',
  '활기차고 사람 많은 모임이 즐거워요',
  '커피 향 맡으며 책 얘기 하고 싶어요',
  '주말 저녁 가볍게 한잔 + 보드게임',
  '낯가림 있지만 천천히 친해지는 게 좋아요',
]

const KEYWORD_MAP: Array<{ matches: string[]; tags: string[] }> = [
  { matches: ['와인', '레드', '화이트', '소믈리에'], tags: ['wine'] },
  { matches: ['커피', '에스프레소', '드립', '카페'], tags: ['coffee'] },
  { matches: ['차', '다실', '우롱', '녹차'], tags: ['tea'] },
  { matches: ['위스키', '몰트', '버번', '바'], tags: ['whisky'] },
  { matches: ['칵테일', '바', '믹솔로지'], tags: ['cocktail'] },
  { matches: ['맥주', '비어', 'ipa'], tags: ['beer'] },
  { matches: ['사케', '일본', '청주'], tags: ['sake'] },
  { matches: ['디저트', '케이크', '카눌레', '단거'], tags: ['dessert'] },
  { matches: ['조용', '깊은', '진지', '내향', '낯가림'], tags: ['차분', '깊은 대화'] },
  { matches: ['활기', '에너지', '외향', '시끌'], tags: ['활기'] },
  { matches: ['주말', '저녁', '밤'], tags: ['저녁'] },
  { matches: ['책', '독서', '문학'], tags: ['책'] },
  { matches: ['보드게임', '게임', '퀴즈'], tags: ['게임'] },
  { matches: ['이성', '5:5', '매칭', '소개팅'], tags: ['이성매칭', '5:5'] },
  { matches: ['무료', '부담 없', '가볍'], tags: ['무료', '캐주얼'] },
]

function extractInterests(text: string): string[] {
  const lower = text.toLowerCase()
  const out = new Set<string>()
  for (const { matches, tags } of KEYWORD_MAP) {
    if (matches.some((m) => lower.includes(m))) {
      for (const t of tags) out.add(t)
    }
  }
  return [...out]
}

export default function VibePage() {
  const [text, setText] = useState('')
  const [committed, setCommitted] = useState<string | null>(null)
  const { data, isLoading } = useParties({ status: 'open', pageSize: 50 })

  const interests = useMemo(() => extractInterests(committed ?? ''), [committed])
  const picks = useMemo(() => {
    if (!data || !committed) return []
    return recommendParties(data.items, { interests }, 6)
  }, [data, committed, interests])

  const canSubmit = text.trim().length > 0

  return (
    <main className={styles.page} aria-labelledby="vibe-title">
      <div className={styles.veil} aria-hidden="true" />

      <motion.section
        className={styles.intro}
        aria-labelledby="vibe-title"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      >
        <Badge tone="gold" size="md">
          <Icon name="sparkle" className={styles.badgeIcon} aria-hidden="true" />
          VIBE CHECK
        </Badge>
        <EnchantingTitle id="vibe-title" className={styles.title}>
          오늘의 기분을 한 줄로,
          <br />
          어울리는 모임 찾아드릴게요.
        </EnchantingTitle>
        <p className={styles.lead}>자기소개 형식이 아니어도 좋아요. 키워드만 던져도 충분합니다.</p>

        <div className={styles.composerBlock}>
          <label htmlFor="vibe-input" className={styles.fieldLabel}>
            지금의 기분 · 키워드
          </label>
          <textarea
            id="vibe-input"
            className={styles.composer}
            rows={3}
            placeholder="예) 조용한 와인 한잔, 깊은 대화 좋아해요"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <fieldset className={styles.suggest}>
          <legend className={styles.suggestLabel}>이렇게 적어도 좋아요</legend>
          <div className={styles.tagRow}>
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s}
                selected={text === s}
                onClick={() => {
                  setText(s)
                  setCommitted(s)
                }}
              >
                {s}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Button
          className={styles.cta}
          size="xl"
          variant="primary"
          disabled={!canSubmit}
          leftIcon={<Icon name="sparkle" aria-hidden="true" />}
          onClick={() => setCommitted(text.trim())}
        >
          추천 받기
        </Button>
      </motion.section>

      <section className={styles.result} aria-live="polite" aria-labelledby="result-title">
        {committed && (
          <>
            <header className={styles.resultHead}>
              <div className={styles.resultHeadText}>
                <h2 id="result-title" className={styles.resultTitle}>
                  이런 모임이 어울려요
                </h2>
                {interests.length > 0 && (
                  <p className={styles.muted}>
                    감지한 키워드: {interests.map((t) => `#${t}`).join(' ')}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="close" aria-hidden="true" />}
                onClick={() => {
                  setCommitted(null)
                  setText('')
                }}
              >
                다시 시도
              </Button>
            </header>
            {isLoading ? (
              <Loading />
            ) : picks.length === 0 ? (
              <EmptyState
                emoji="🌙"
                title="딱 맞는 모임을 못 찾았어요"
                description="조금 다르게 적어보거나, 전체 둘러보기로 가볼까요?"
                action={
                  <Link to="/discover">
                    <Button variant="primary">전체 모임 둘러보기</Button>
                  </Link>
                }
              />
            ) : (
              <div className={styles.grid}>
                {picks.map((p) => (
                  <PartyCard key={p.id} party={p} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
