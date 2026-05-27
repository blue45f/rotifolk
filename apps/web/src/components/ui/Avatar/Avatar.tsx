import type { CSSProperties } from 'react'
import styles from './Avatar.module.css'

interface AvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hue?: string
  pattern?: 'solid' | 'gradient' | 'sparkle' | 'wave'
  emoji?: string
  initials?: string
  ring?: 'none' | 'soft' | 'glow' | 'gold'
  label?: string
}

export function Avatar({
  size = 'md',
  hue = '#7A1F3D',
  pattern = 'gradient',
  emoji,
  initials,
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
      <div className={[styles.surface, styles[`p_${pattern}`]].join(' ')} />
      <div className={styles.face}>
        {emoji ? <span className={styles.emoji}>{emoji}</span> : initials ? <span>{initials}</span> : null}
      </div>
    </div>
  )
}

export default Avatar
