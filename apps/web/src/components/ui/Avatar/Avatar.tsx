import styles from './Avatar.module.css'

import type { CSSProperties } from 'react'

interface AvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hue?: string
  pattern?: 'solid' | 'gradient' | 'sparkle' | 'wave'
  emoji?: string
  initials?: string
  /** 직접 업로드한 프로필 사진(data URL/URL). 있으면 프리셋(hue/pattern/emoji) 대신 렌더. */
  imageSrc?: string | null
  ring?: 'none' | 'soft' | 'glow' | 'gold'
  label?: string
}

export function Avatar({
  size = 'md',
  hue = 'var(--color-primary)',
  pattern = 'gradient',
  emoji,
  initials,
  imageSrc,
  ring = 'none',
  label,
}: AvatarProps) {
  const style: CSSProperties = {
    '--avatar-hue': hue,
  } as CSSProperties

  return (
    <div
      className={[styles.avatar, styles[`s_${size}`], styles[`r_${ring}`]].join(' ')}
      style={style}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {imageSrc ? (
        // 접근성 이름은 컨테이너(aria-label)가 제공 — 내부 img는 장식으로 둔다.
        <img src={imageSrc} alt="" aria-hidden="true" className={styles.image} draggable={false} />
      ) : (
        <>
          <div className={[styles.surface, styles[`p_${pattern}`]].join(' ')} />
          <div className={styles.face}>
            {emoji ? (
              <span className={styles.emoji}>{emoji}</span>
            ) : initials ? (
              <span>{initials}</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export default Avatar
