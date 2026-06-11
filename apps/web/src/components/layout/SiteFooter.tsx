import { Link, useLocation } from 'react-router-dom'
import { useT } from '@features/i18n/i18n'
import styles from './SiteFooter.module.css'

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
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/privacy" className={styles.privacy}>
            {t('footer.privacy')}
          </Link>
          <Link to="/cancel-policy">{t('footer.refund')}</Link>
          <Link to={`/policies?from=${encodedCurrentPath}`}>{t('nav.policies')}</Link>
          <Link to={`/help?from=${encodedCurrentPath}`}>{t('nav.help')}</Link>
          <Link to={`/community?from=${encodedCurrentPath}`}>{t('nav.community')}</Link>
          <Link to="/clubs">{t('nav.clubs')}</Link>
          <Link to="/support">{t('footer.support')}</Link>
        </nav>
        <p className={styles.copyright}>© {year} rotifolk</p>
      </div>
    </footer>
  )
}
