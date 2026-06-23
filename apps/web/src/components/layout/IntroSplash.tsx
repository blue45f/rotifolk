import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'

import styles from './IntroSplash.module.css'

export function IntroSplash() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // 2.2s splash duration, then trigger fadeout
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 2200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        >
          {/* Animated luxury background */}
          <div className={styles.bgMesh} />

          {/* 3D Rotating Rings and Icons */}
          <div className={styles.visualContainer}>
            {/* Outer Orbit */}
            <motion.div
              className={styles.orbitOuter}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            >
              <div className={styles.orbitRingOuter} />
              
              {/* Floating Items on Orbit */}
              <div className={`${styles.orbitNode} ${styles.wineNode}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 2.5 5 2.5 7h7c0-2 2.5-3.5 2.5-7 0-3.5-2.5-6-6-6Z" />
                  <path d="M12 15v5M9 22h6" />
                  <path d="M7.5 8h9" />
                </svg>
              </div>

              <div className={`${styles.orbitNode} ${styles.coffeeNode}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                  <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" />
                  <path d="M6 2v2M10 2v2M14 2v2" />
                </svg>
              </div>

              <div className={`${styles.orbitNode} ${styles.teaNode}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 14h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2H2v9Z" />
                  <path d="M20 7h1c1.7 0 3 1.3 3 3s-1.3 3-3 3h-1" />
                  <path d="M6 14v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5" />
                  <path d="M5 2c.5 1 .5 2 0 3M9 2c.5 1 .5 2 0 3M13 2c.5 1 .5 2 0 3" />
                </svg>
              </div>
            </motion.div>

            {/* Inner Ring (revolving in opposite direction) */}
            <motion.div
              className={styles.orbitInner}
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            >
              <div className={styles.orbitRingInner} />
              <div className={styles.innerCoreGlow} />
            </motion.div>

            {/* Center core */}
            <div className={styles.centerMatchCore}>
              <div className={styles.matchIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4.5v15M4.5 12h15" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Luxury Typography */}
          <div className={styles.brandInfo}>
            <motion.h1
              className={styles.title}
              initial={{ y: 20, opacity: 0, filter: 'blur(5px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              ROTIFOLK
            </motion.h1>
            <motion.div
              className={styles.divider}
              initial={{ width: 0 }}
              animate={{ width: 100 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
            <motion.p
              className={styles.tagline}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              Premium Wine, Coffee, Tea Rotation Gatherings
            </motion.p>
            <motion.span
              className={styles.betaBadge}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              Beta Service
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
