import { describe, expect, it } from 'vitest'

import indexHtml from '../../../index.html?raw'
import manifestSource from '../../../public/manifest.webmanifest?raw'

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose: string
}

interface ManifestShortcut {
  name: string
  url: string
  icons: Pick<ManifestIcon, 'src' | 'sizes' | 'type'>[]
}

const manifest = JSON.parse(manifestSource) as {
  id: string
  start_url: string
  description: string
  icons: ManifestIcon[]
  shortcuts: ManifestShortcut[]
}

// Compile-time glob of the deployable icon assets — a manifest entry pointing at a
// file missing from public/ fails here instead of as a 404 on someone's home screen.
const publicAssets = Object.keys(import.meta.glob('../../../public/*.{png,svg}')).map((key) =>
  key.replace('../../../public', '')
)

describe('manifest.webmanifest icons', () => {
  it('declares a single purpose per icon (no "any maskable" mixing)', () => {
    for (const icon of manifest.icons) {
      expect(['any', 'maskable']).toContain(icon.purpose)
    }
  })

  it('ships PNG fallbacks at 192 and 512 for launchers without SVG support', () => {
    const anyPngSizes = manifest.icons
      .filter((icon) => icon.purpose === 'any' && icon.type === 'image/png')
      .map((icon) => icon.sizes)

    expect(anyPngSizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  })

  it('ships a dedicated full-bleed maskable PNG instead of reusing the inset favicon', () => {
    const maskable = manifest.icons.filter((icon) => icon.purpose === 'maskable')

    expect(maskable).toEqual([
      expect.objectContaining({
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
      }),
    ])
  })

  it('points every icon at a file that exists in public/', () => {
    for (const icon of manifest.icons) {
      expect(publicAssets, `${icon.src} is missing from public/`).toContain(icon.src)
    }
  })
})

describe('manifest.webmanifest identity', () => {
  it('pins an explicit id so the install identity survives start_url changes', () => {
    expect(manifest.id).toBe('/')
  })

  it('keeps the description in sync with the index.html meta description', () => {
    expect(indexHtml).toContain(`content="${manifest.description}"`)
  })
})

describe('manifest.webmanifest shortcuts', () => {
  it('offers long-press jumps to discover and quick-create', () => {
    expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual(['/discover', '/quick'])
  })

  it('keeps every shortcut url inside the manifest scope', () => {
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.url, `${shortcut.name} escapes scope "/"`).toMatch(/^\//)
    }
  })

  it('gives every shortcut a 96x96+ PNG icon that exists in public/', () => {
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.icons.length, `${shortcut.name} has no icons`).toBeGreaterThan(0)
      for (const icon of shortcut.icons) {
        expect(publicAssets, `${icon.src} is missing from public/`).toContain(icon.src)
        expect(icon.type).toBe('image/png')
        const [width = 0] = icon.sizes.split('x').map(Number)
        expect(width, `${icon.src} is below the 96x96 shortcut minimum`).toBeGreaterThanOrEqual(96)
      }
    }
  })
})

describe('index.html apple-touch-icon', () => {
  it('links the 180x180 home-screen icon the apple-mobile-web-app metas rely on', () => {
    expect(indexHtml).toContain('rel="apple-touch-icon"')
    expect(indexHtml).toContain('href="/apple-touch-icon.png"')
    expect(publicAssets).toContain('/apple-touch-icon.png')
  })
})
