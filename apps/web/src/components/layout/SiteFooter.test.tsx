import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { SiteFooter } from './SiteFooter'

import { I18nProvider } from '@/domains/i18n/i18n'

function renderFooter(initialPath = '/venues') {
  // detectInitialLocale은 jsdom의 navigator.language를 따르므로 한국어로 고정한다.
  globalThis.localStorage.setItem('rotifolk-locale', 'ko')
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <SiteFooter />
      </MemoryRouter>
    </I18nProvider>
  )
}

describe('SiteFooter', () => {
  afterEach(() => {
    globalThis.localStorage.clear()
  })

  it('exposes always-visible trust links for terms, privacy, and refund policies', () => {
    renderFooter()

    const nav = within(screen.getByRole('contentinfo')).getByRole('navigation', {
      name: '약관 및 도움말',
    })

    expect(within(nav).getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms')
    expect(within(nav).getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy'
    )
    expect(within(nav).getByRole('link', { name: '환불 정책' })).toHaveAttribute(
      'href',
      '/cancel-policy'
    )
  })

  it('carries the return path on internal links and stamps the current year', () => {
    renderFooter('/venues')

    expect(screen.getByRole('link', { name: '정책' })).toHaveAttribute(
      'href',
      '/policies?from=%2Fvenues'
    )
    expect(screen.getByRole('link', { name: '도움말' })).toHaveAttribute(
      'href',
      '/help?from=%2Fvenues'
    )
    expect(screen.getByRole('link', { name: '커뮤니티' })).toHaveAttribute(
      'href',
      '/community?from=%2Fvenues'
    )
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()}\\s*rotifolk`))).toBeInTheDocument()
  })
})
