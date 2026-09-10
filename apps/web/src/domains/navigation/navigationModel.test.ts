import { describe, expect, it } from 'vitest'

import { buildGlobalNavigation, isNavigationItemActive } from './navigationModel'

function keysFor(role: Parameters<typeof buildGlobalNavigation>[0]) {
  return buildGlobalNavigation(role).flatMap((section) => section.items.map((item) => item.key))
}

describe('buildGlobalNavigation', () => {
  it('keeps protected account and host tools out of the guest menu', () => {
    const keys = keysFor(null)

    expect(keys).toContain('discover')
    expect(keys).toContain('tutorial')
    expect(keys).not.toContain('profile')
    expect(keys).not.toContain('host-console')
    expect(keys).not.toContain('admin-dashboard')
  })

  it('shows the host application to participants and operational tools to hosts', () => {
    expect(keysFor('participant')).toContain('become-host')
    expect(keysFor('participant')).not.toContain('host-console')

    expect(keysFor('host')).toContain('host-console')
    expect(keysFor('host')).not.toContain('become-host')
  })

  it('adds moderation tools only for administrators', () => {
    expect(keysFor('admin')).toContain('admin-moderation')
    expect(keysFor('host')).not.toContain('admin-moderation')
  })

  it('does not expose duplicate destinations within a role menu', () => {
    for (const role of [null, 'participant', 'host', 'admin'] as const) {
      const keys = keysFor(role)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})

describe('isNavigationItemActive', () => {
  const discover = buildGlobalNavigation(null)
    .flatMap((section) => section.items)
    .find((item) => item.key === 'discover')!

  it('keeps the discovery destination active through party detail routes', () => {
    expect(isNavigationItemActive('/discover', discover)).toBe(true)
    expect(isNavigationItemActive('/parties/p_1', discover)).toBe(true)
    expect(isNavigationItemActive('/category/wine', discover)).toBe(true)
    expect(isNavigationItemActive('/community', discover)).toBe(false)
  })
})
