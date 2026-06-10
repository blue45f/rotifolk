import { describe, expect, it } from 'vitest'
import indexHtml from '../../../index.html?raw'
import manifestSource from '../../../public/manifest.webmanifest?raw'

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose: string
}

const manifest = JSON.parse(manifestSource) as { icons: ManifestIcon[] }

// Compile-time glob of the deployable icon assets — a manifest entry pointing at a
// file missing from public/ fails here instead of as a 404 on someone's home screen.
const publicAssets = Object.keys(import.meta.glob('../../../public/*.{png,svg}')).map((key) =>
  key.replace('../../../public', ''),
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

describe('index.html apple-touch-icon', () => {
  it('links the 180x180 home-screen icon the apple-mobile-web-app metas rely on', () => {
    expect(indexHtml).toContain('rel="apple-touch-icon"')
    expect(indexHtml).toContain('href="/apple-touch-icon.png"')
    expect(publicAssets).toContain('/apple-touch-icon.png')
  })
})
