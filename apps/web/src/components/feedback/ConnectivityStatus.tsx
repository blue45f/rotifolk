import { Icon } from '@components/ui/Icon/Icon'
import { useEffect, useState } from 'react'

import styles from './ConnectivityStatus.module.css'

type ConnectionState = 'online' | 'offline' | 'restored'

function readInitialState(): ConnectionState {
  if (typeof navigator === 'undefined') return 'online'
  return navigator.onLine ? 'online' : 'offline'
}

export function ConnectivityStatus() {
  const [state, setState] = useState<ConnectionState>(readInitialState)

  useEffect(() => {
    let restoredTimer: number | undefined

    const clearRestoredTimer = () => {
      if (restoredTimer !== undefined) window.clearTimeout(restoredTimer)
      restoredTimer = undefined
    }

    const handleOffline = () => {
      clearRestoredTimer()
      setState('offline')
    }

    const handleOnline = () => {
      clearRestoredTimer()
      setState('restored')
      restoredTimer = window.setTimeout(() => setState('online'), 4_000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      clearRestoredTimer()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (state === 'online') return null

  const offline = state === 'offline'

  return (
    <div
      className={`${styles.banner} ${offline ? styles.offline : styles.restored}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon name={offline ? 'live' : 'check'} />
      </span>
      <span className={styles.copy}>
        <strong>{offline ? '인터넷 연결이 끊겼어요' : '다시 연결됐어요'}</strong>
        <span>
          {offline
            ? '현재 화면은 볼 수 있지만 새 데이터와 참여 요청이 지연될 수 있어요.'
            : '이제 최신 모임과 메시지를 다시 확인할 수 있어요.'}
        </span>
      </span>
    </div>
  )
}

export default ConnectivityStatus
