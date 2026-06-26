import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import styles from './EnchantingTitle.module.css'

import { playBangTick } from '@/lib/uiSound'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4'

interface EnchantingTitleProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  'children' | 'onClick' | 'onKeyDown'
> {
  as?: HeadingTag
  children: ReactNode
  interactive?: boolean
  particleCount?: number
  sound?: boolean
  onClick?: (event: MouseEvent<HTMLHeadingElement>) => void
  onKeyDown?: (event: KeyboardEvent<HTMLHeadingElement>) => void
}

export function EnchantingTitle({
  as = 'h1',
  children,
  className,
  interactive = false,
  particleCount = 12,
  sound = true,
  onClick,
  onKeyDown,
  role: roleProp,
  tabIndex: tabIndexProp,
  ...rest
}: EnchantingTitleProps) {
  const [isBang, setIsBang] = useState(false)
  const bangTimerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const runBang = useCallback(() => {
    if (!interactive) return

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (bangTimerRef.current != null) {
      window.clearTimeout(bangTimerRef.current)
      bangTimerRef.current = null
    }

    setIsBang(false)
    rafRef.current = requestAnimationFrame(() => {
      setIsBang(true)
      rafRef.current = null
    })

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }

    bangTimerRef.current = window.setTimeout(() => {
      setIsBang(false)
      bangTimerRef.current = null
    }, 920)
  }, [interactive])

  useEffect(() => {
    return () => {
      if (bangTimerRef.current != null) {
        window.clearTimeout(bangTimerRef.current)
      }

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const total = Math.min(Math.max(Math.trunc(particleCount), 5), 20)
  const particles = Array.from({ length: total }, (_, idx) => {
    const rotate = `${(idx / total) * 360}deg`
    const distance = `${17 + ((idx * 3) % 11)}px`
    const size = `${2 + (idx % 3) * 0.35 + 0.05}px`

    return (
      <span
        className={styles.titleParticle}
        key={`particle-${idx}`}
        style={
          {
            '--enchant-burst-rotate': rotate,
            '--enchant-burst-distance': distance,
            '--enchant-burst-size': size,
            '--title-burst-delay': `${idx * 24}ms`,
          } as CSSProperties & Record<string, string>
        }
      />
    )
  })

  const ambientCount = Math.min(Math.max(Math.trunc(particleCount * 1.4), 9), 22)
  const ambientSparks = Array.from({ length: ambientCount }, (_, idx) => {
    const angle = `${(idx / ambientCount) * 360}deg`
    const distance = `${9 + ((idx * 5) % 14)}px`
    const size = `${1.2 + (idx % 4) * 0.45}px`
    const delay = `${(idx * 270 + (idx % 7) * 90) % 2800}ms`
    const duration = `${3.2 + (idx % 6) * 0.32}s`
    const drift = `${-8 + (idx % 6) * 2.6}px`

    return (
      <span
        className={styles.titleSparkle}
        key={`ambient-${idx}`}
        style={
          {
            '--enchant-sparkle-rotate': angle,
            '--enchant-sparkle-distance': distance,
            '--enchant-sparkle-size': size,
            '--title-sparkle-delay': delay,
            '--title-sparkle-duration': duration,
            '--title-sparkle-drift': drift,
          } as CSSProperties & Record<string, string>
        }
      />
    )
  })

  const Heading = as as HeadingTag
  const cls = [
    styles.title,
    interactive && styles.titleInteractive,
    isBang && styles.titleActive,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const playBangSound = () => {
    if (
      !sound ||
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    playBangTick()
  }

  const handleClick = (event: MouseEvent<HTMLHeadingElement>) => {
    runBang()
    playBangSound()
    onClick?.(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLHeadingElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      runBang()
      playBangSound()
    }

    onKeyDown?.(event)
  }

  return (
    <Heading
      {...rest}
      data-ui-local-sound
      className={cls}
      role={interactive ? 'button' : roleProp}
      tabIndex={interactive ? (tabIndexProp ?? 0) : tabIndexProp}
      onClick={interactive ? handleClick : onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
    >
      <span className={styles.titleShimmer} aria-hidden="true" />
      <span className={styles.titleAura} aria-hidden="true" />
      <span className={styles.titleText}>
        <span className={styles.titleShine}>{children}</span>
      </span>
      <span className={styles.titleSparkleField} aria-hidden="true">
        {ambientSparks}
      </span>
      <span className={styles.titleBurst} aria-hidden="true">
        {particles}
        <span className={styles.titleRing} />
        <span className={styles.titleRingSecond} />
      </span>
    </Heading>
  )
}

export default EnchantingTitle
