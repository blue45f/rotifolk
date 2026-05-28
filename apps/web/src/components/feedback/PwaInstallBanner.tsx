import { usePwaInstall } from '@features/pwa/usePwaInstall'
import styles from './PwaInstallBanner.module.css'

export default function PwaInstallBanner() {
  const { canInstall, install, dismiss } = usePwaInstall()
  if (!canInstall) return null
  return (
    <div className={styles.bar} role="status" aria-label="홈 화면 추가 안내">
      <span className={styles.icon} aria-hidden="true">🍷</span>
      <div className={styles.body}>
        <strong>Rotifolk 앱으로 추가</strong>
        <span>한 번에 알림 받고 더 빨리 열기</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.dismiss} onClick={dismiss}>나중에</button>
        <button type="button" className={styles.install} onClick={install}>홈 화면에 추가</button>
      </div>
    </div>
  )
}
