import { Link } from 'react-router-dom'
import { Button } from '@components/ui/Button/Button'
import styles from './GuestConversionBanner.module.css'

/**
 * 게스트 화면 상단 전환 배너 — 가입하면 guestToken으로 참여 이력이
 * 자동 연결된다(가입/로그인 성공 시 auth/claim-guest 호출).
 */
export function GuestConversionBanner({ from }: { from?: string }) {
  return (
    <div className={styles.banner} role="note" aria-label="계정 만들기 안내">
      <span className={styles.icon} aria-hidden="true">
        ✨
      </span>
      <div className={styles.copy}>
        <strong className={styles.title}>계정을 만들면 오늘의 기록이 저장돼요</strong>
        <span className={styles.sub}>
          참여 이력·매칭 결과·쪽지가 계정에 연결돼요. 지금 만든 게스트 기록도 그대로 가져가요.
        </span>
      </div>
      <span className={styles.cta}>
        <Link to="/signup" state={from ? { from } : undefined}>
          <Button variant="gold" size="sm">
            계정 만들기
          </Button>
        </Link>
      </span>
    </div>
  )
}

export default GuestConversionBanner
