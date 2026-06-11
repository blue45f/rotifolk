import { Controller, Get, Header } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

/**
 * SEO 엔드포인트. Nest 글로벌 프리픽스(`api`) 때문에 실제 경로는
 * `/api/seo/sitemap.xml` · `/api/seo/robots.txt` 이며, apps/web 의 Vite dev
 * 프록시(vite.config.ts)와 프로덕션 rewrite(루트 vercel.json)가
 * `/sitemap.xml` · `/robots.txt` 를 여기로 넘긴다. robots 의 `Sitemap:` 절대
 * URL 도 같은 baseUrl() 에서 나오므로 rewrite 를 거쳐 그대로 해석된다.
 */

// 정적 공개 콘텐츠 라우트만 sitemap 에 싣는다. 인증이 필요한 me/*, host/*, chats,
// admin, 그리고 로그인/가입/즉석개설(/quick) 같은 비색인 페이지는 제외한다.
// apps/web/src/router/index.tsx 의 실제 라우트와 일치한다.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily' },
  { path: '/discover', changefreq: 'daily' },
  { path: '/venues', changefreq: 'daily' },
  { path: '/vibe', changefreq: 'weekly' },
  { path: '/neighborhood', changefreq: 'weekly' },
  { path: '/community', changefreq: 'daily' },
  { path: '/search', changefreq: 'weekly' },
  { path: '/digest', changefreq: 'weekly' },
  { path: '/help', changefreq: 'monthly' },
  { path: '/policies', changefreq: 'monthly' },
  { path: '/terms', changefreq: 'monthly' },
  { path: '/privacy', changefreq: 'monthly' },
  { path: '/cancel-policy', changefreq: 'monthly' },
] as const

// 카테고리는 유한·고정 집합이라 항상 유효한 공개 페이지다(/category/:value).
// apps/web/src/features/categories/meta.ts 의 CATEGORY_META 키와 일치한다.
const CATEGORY_VALUES = [
  'wine',
  'natural-wine',
  'coffee',
  'tea',
  'whisky',
  'cocktail',
  'beer',
  'sake',
  'dessert',
] as const

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

@Controller('seo')
export class SeoController {
  constructor(private readonly prisma: PrismaService) {}

  private baseUrl(): string {
    // CORS_ORIGIN 은 콤마 구분 허용목록이라 첫 origin 을 정식 도메인으로 쓴다.
    const fromCors = process.env.CORS_ORIGIN?.split(',')[0]?.trim()
    return process.env.PUBLIC_BASE_URL?.trim() || fromCors || 'https://rotifolk.vercel.app'
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(): Promise<string> {
    const base = this.baseUrl().replace(/\/$/, '')

    // 공개적으로 색인 가능한 파티만(open/full/live). draft/locked/ended/cancelled 제외.
    // 존재하지 않는 URL 을 만들지 않도록 실제 DB row 에서만 생성한다.
    const parties = await this.prisma.party.findMany({
      where: { status: { in: ['open', 'full', 'live'] } },
      select: { id: true, updatedAt: true },
      orderBy: { startAt: 'desc' },
      take: 5000,
    })

    const url = (loc: string, changefreq: string, lastmod?: string) =>
      `<url><loc>${escapeXml(loc)}</loc>` +
      (lastmod ? `<lastmod>${lastmod}</lastmod>` : '') +
      `<changefreq>${changefreq}</changefreq></url>`

    const urls = [
      ...STATIC_ROUTES.map((r) => url(`${base}${r.path}`, r.changefreq)),
      ...CATEGORY_VALUES.map((c) => url(`${base}/category/${c}`, 'daily')),
      ...parties.map((p) => url(`${base}/parties/${p.id}`, 'hourly', p.updatedAt.toISOString())),
    ].join('\n  ')

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls}\n</urlset>\n`
    )
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    const base = this.baseUrl().replace(/\/$/, '')
    return (
      `User-agent: *\n` +
      `Allow: /\n` +
      // 인증 전용·비색인 영역은 크롤 제외.
      `Disallow: /admin\n` +
      `Disallow: /me\n` +
      `Disallow: /host\n` +
      `Disallow: /chats\n` +
      `Disallow: /notifications\n` +
      `Disallow: /live\n` +
      `Sitemap: ${base}/sitemap.xml\n`
    )
  }
}
