import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import styles from './RouteAnnouncer.module.css'

export function RouteAnnouncer() {
  const location = useLocation()
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const title = document.title.replace(/\s*[·|-]\s*Rotifolk\s*$/i, '').trim()
      setMessage(`${title || '새'} 페이지로 이동했습니다.`)
    }, 120)

    return () => window.clearTimeout(timer)
  }, [location.pathname])

  return (
    <p className={styles.announcer} aria-live="polite" aria-atomic="true">
      {message}
    </p>
  )
}

export default RouteAnnouncer
