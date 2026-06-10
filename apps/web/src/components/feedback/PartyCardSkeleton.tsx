import styles from './PartyCardSkeleton.module.css'

export function PartyCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.cover} />
      <div className={styles.body}>
        <span className={`${styles.bone} ${styles.titleLine}`} />
        <span className={`${styles.bone} ${styles.metaLine}`} />
        <span className={`${styles.bone} ${styles.gauge}`} />
        <div className={styles.footer}>
          <span className={`${styles.bone} ${styles.people}`} />
          <span className={`${styles.bone} ${styles.price}`} />
        </div>
      </div>
    </div>
  )
}

export default function PartyCardSkeletonGrid({
  count = 6,
  label = '로딩 중',
}: {
  count?: number
  label?: string
}) {
  return (
    <div className={styles.grid} role="status" aria-live="polite" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <PartyCardSkeleton key={i} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
