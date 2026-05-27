import styles from './Loading.module.css'

export default function Loading({ label = '로딩 중' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.ring} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
