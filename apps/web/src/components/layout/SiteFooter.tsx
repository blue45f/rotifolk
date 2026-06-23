import { Link, useLocation } from 'react-router-dom'

import styles from './SiteFooter.module.css'

import { useT } from '@/domains/i18n/useI18n'

export function SiteFooter() {
  const t = useT()
  const location = useLocation()
  const currentPath = `${location.pathname}${location.search}${location.hash}`
  const encodedCurrentPath = encodeURIComponent(currentPath || '/')
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.brandLine}>
          <span className={styles.brandName}>rotifolk</span>
          <span>{t('footer.tagline')}</span>
        </p>
        <nav className={styles.links} aria-label={t('footer.navLabel')}>
          <Link to="/venues">{t('nav.venues')}</Link>
          <Link to={`/community?from=${encodedCurrentPath}`}>{t('nav.community')}</Link>
          <Link to="/clubs">{t('nav.clubs')}</Link>
          <Link to="/digest">{t('nav.digest')}</Link>
          <Link to={`/tutorial?from=${encodedCurrentPath}`}>{t('nav.tutorial')}</Link>
          <Link to={`/help?from=${encodedCurrentPath}`}>{t('nav.help')}</Link>
          <Link to={`/policies?from=${encodedCurrentPath}`}>{t('nav.policies')}</Link>
          <Link to="/support">{t('footer.support')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/privacy" className={styles.privacy}>
            {t('footer.privacy')}
          </Link>
          <Link to="/cancel-policy">{t('footer.refund')}</Link>
        </nav>
        <div className={styles.businessInfo}>
          <div className={styles.businessGrid}>
            <div>
              <p style={{ fontWeight: 'bold' }}>상호: 에이치준랩스</p>
              <p>대표자: 김희준 | 개인정보보호책임자: 김희준</p>
            </div>
            <div>
              <p>사업자등록번호: 355-07-03473</p>
              <p>주소: 서울특별시 송파구 가락로34길 13, 101호(방이동)</p>
            </div>
            <div>
              <p>이메일: blue45f@gmail.com</p>
              <p>전화번호: 010-3873-4197</p>
            </div>
            <div>
              <p>호스팅 서비스: Vercel (Frontend)</p>
              <p>플랫폼 형태: 와인 및 소모임 매칭 플랫폼</p>
            </div>
          </div>
          <div className={styles.businessBottom}>
            <span>© {year} rotifolk. All rights reserved.</span>
            <Link to="/sitemap" className={styles.meta}>
              사이트맵
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
