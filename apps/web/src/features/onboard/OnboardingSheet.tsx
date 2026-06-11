import { useEffect, useState } from 'react'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import styles from './Onboarding.module.css'

const KEY = 'rotifolk-onboarded-v1'

const SLIDES = [
  {
    badge: '환영',
    title: '한 모금이 끝나기 전,\n다음 자리로.',
    body: '호스트가 짠 5분 라운드로 모든 사람을 만나고, 마지막 라운드에 서로를 고른 사람과 1:1로 이어집니다.',
    emoji: '🍷',
  },
  {
    badge: '카테고리',
    title: '오늘의 잔을 골라요.',
    body: '와인, 커피, 차, 위스키 — 카테고리마다 라운드 컨셉과 분위기가 달라요. 즉석 모임도 1분 만에 열 수 있어요.',
    emoji: '✨',
  },
  {
    badge: '안전',
    title: '아바타로도 충분해요.',
    body: '실명·사진 강요 없이 닉네임과 아바타만으로 시작할 수 있어요. 마주치기 싫은 사람은 차단으로 안전하게.',
    emoji: '🌙',
  },
] as const

interface OnboardingSheetProps {
  forceOpenSignal?: number
}

function shouldOpenInitialOnboarding(): boolean {
  try {
    return !localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export default function OnboardingSheet({ forceOpenSignal = 0 }: OnboardingSheetProps) {
  const [open, setOpen] = useState(shouldOpenInitialOnboarding)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpenSignal <= 0) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setStep(0)
      setOpen(true)
    })
    return () => {
      cancelled = true
    }
  }, [forceOpenSignal])

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(KEY, String(Date.now()))
    } catch {}
  }

  if (!open) return null
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  return (
    <Sheet
      open={open}
      onClose={close}
      variant="modal"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            건너뛰기
          </Button>
          {isLast ? (
            <Button variant="primary" onClick={close}>
              시작하기
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStep((n) => n + 1)}>
              다음 →
            </Button>
          )}
        </>
      }
    >
      <div className={styles.slide}>
        <span className={styles.emoji} aria-hidden="true">
          {slide.emoji}
        </span>
        <Badge tone="gold" size="md">
          {slide.badge}
        </Badge>
        <h2 className={styles.title}>{slide.title}</h2>
        <p className={styles.body}>{slide.body}</p>
        <div className={styles.dots} role="tablist" aria-label="진행">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
              aria-current={i === step}
            />
          ))}
        </div>
      </div>
    </Sheet>
  )
}
