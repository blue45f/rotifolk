import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SeoController } from './seo.controller'

import { PrismaService } from '@/prisma/prisma.service'

type PartyRow = { id: string; updatedAt: Date }

function makeController(parties: PartyRow[]): SeoController {
  const prisma = {
    party: { findMany: vi.fn().mockResolvedValue(parties) },
  } as unknown as PrismaService
  return new SeoController(prisma)
}

describe('SeoController', () => {
  const originalBase = process.env.PUBLIC_BASE_URL
  const originalCors = process.env.CORS_ORIGIN

  beforeEach(() => {
    delete process.env.PUBLIC_BASE_URL
    delete process.env.CORS_ORIGIN
  })

  afterEach(() => {
    if (originalBase === undefined) delete process.env.PUBLIC_BASE_URL
    else process.env.PUBLIC_BASE_URL = originalBase
    if (originalCors === undefined) delete process.env.CORS_ORIGIN
    else process.env.CORS_ORIGIN = originalCors
  })

  describe('sitemap', () => {
    it('renders a valid urlset with static, category, and real party URLs', async () => {
      const controller = makeController([
        { id: 'party-abc', updatedAt: new Date('2026-06-01T10:00:00.000Z') },
      ])

      const xml = await controller.sitemap()

      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(xml).toContain('</urlset>')
      // static public routes
      expect(xml).toContain('<loc>https://rotifolk.vercel.app/</loc>')
      expect(xml).toContain('<loc>https://rotifolk.vercel.app/discover</loc>')
      expect(xml).toContain('<loc>https://rotifolk.vercel.app/venues</loc>')
      // finite, always-valid category pages
      expect(xml).toContain('<loc>https://rotifolk.vercel.app/category/wine</loc>')
      expect(xml).toContain('<loc>https://rotifolk.vercel.app/category/natural-wine</loc>')
      // only real party rows are emitted
      expect(xml).toContain('<loc>https://rotifolk.vercel.app/parties/party-abc</loc>')
      expect(xml).toContain('<lastmod>2026-06-01T10:00:00.000Z</lastmod>')
    })

    it('only queries publicly indexable party statuses', async () => {
      const controller = makeController([])
      const findMany = (controller as unknown as { prisma: PrismaService }).prisma.party
        .findMany as ReturnType<typeof vi.fn>

      await controller.sitemap()

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['open', 'full', 'live'] } },
        })
      )
    })

    it('prefers PUBLIC_BASE_URL, then first CORS_ORIGIN, then the vercel fallback', async () => {
      process.env.PUBLIC_BASE_URL = 'https://rotifolk.com'
      let xml = await makeController([]).sitemap()
      expect(xml).toContain('<loc>https://rotifolk.com/</loc>')

      delete process.env.PUBLIC_BASE_URL
      process.env.CORS_ORIGIN = 'https://web.rotifolk.com,https://other.example'
      xml = await makeController([]).sitemap()
      expect(xml).toContain('<loc>https://web.rotifolk.com/</loc>')
    })

    it('escapes XML-unsafe characters in URLs', async () => {
      const controller = makeController([
        { id: 'a&b<c', updatedAt: new Date('2026-06-01T10:00:00.000Z') },
      ])
      const xml = await controller.sitemap()
      expect(xml).toContain('/parties/a&amp;b&lt;c')
      expect(xml).not.toContain('/parties/a&b<c')
    })
  })

  describe('robots', () => {
    it('allows crawling, blocks private areas, and points at the sitemap', () => {
      const txt = makeController([]).robots()

      expect(txt).toContain('User-agent: *')
      expect(txt).toContain('Allow: /')
      expect(txt).toContain('Disallow: /admin')
      expect(txt).toContain('Disallow: /me')
      expect(txt).toContain('Sitemap: https://rotifolk.vercel.app/sitemap.xml')
    })

    it('builds the Sitemap URL from the same base-url resolution as the sitemap', () => {
      process.env.PUBLIC_BASE_URL = 'https://rotifolk.com/'

      const txt = makeController([]).robots()

      // 후행 슬래시는 정규화되고, /sitemap.xml 은 rewrite 를 거쳐 같은 도메인에서 해석된다.
      expect(txt).toContain('Sitemap: https://rotifolk.com/sitemap.xml')
      expect(txt).not.toContain('rotifolk.com//sitemap.xml')
    })
  })
})
