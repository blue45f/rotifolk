import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

import { getAdDesk } from './clients'
import { SponsoredRail } from './SponsoredRail'

// AdDesk is env-gated via clients.ts; mock the factory + slots to control state.
vi.mock('./clients', () => ({
  getAdDesk: vi.fn(),
  adDiscoverSlots: ['discover-spotlight-1'],
}))

// Embla needs real layout (ResizeObserver) jsdom lacks; the carousel handles a
// null api, so stub the hook to a ref + no api.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))

const mockGetAdDesk = getAdDesk as unknown as Mock

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SponsoredRail', () => {
  it('renders nothing when AdDesk is off (no client)', () => {
    mockGetAdDesk.mockReturnValue(null)
    const { container } = render(<SponsoredRail />)
    expect(container.querySelector('section')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('renders a sponsored card when a slot serves a creative', async () => {
    const serve = vi.fn().mockResolvedValue({
      served: true,
      creativeId: 'c1',
      imageUrl: 'https://cdn.example.com/ad-1.png',
      linkUrl: 'https://example.com/go',
      alt: '추천 모임',
      size: null,
    })
    mockGetAdDesk.mockReturnValue({
      serve,
      trackImpression: vi.fn().mockResolvedValue({ ok: true, count: 1 }),
      trackClick: vi.fn().mockResolvedValue({ ok: true, count: 1 }),
    })

    const { container } = render(<SponsoredRail />)
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull())

    const link = container.querySelector('a[rel~="sponsored"]')
    expect(link?.getAttribute('href')).toBe('https://example.com/go')
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/ad-1.png'
    )
    expect(serve).toHaveBeenCalledWith(expect.objectContaining({ slot: 'discover-spotlight-1' }))
  })
})
