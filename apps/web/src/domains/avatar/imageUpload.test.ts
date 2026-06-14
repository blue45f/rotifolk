import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AVATAR_RESIZE_MAX_DIM,
  AVATAR_UPLOAD_MAX_BYTES,
  AvatarImageError,
  POST_IMAGE_RESIZE_MAX_DIM,
  POST_IMAGE_UPLOAD_MAX_BYTES,
  resizeAvatarImage,
  resizePostImage,
  scaleToFit,
} from './imageUpload'

/**
 * jsdom에는 실제 canvas 인코더가 없으므로 getContext/toDataURL/createImageBitmap을
 * 모킹해 리사이즈 파이프라인(검증 → 축소 치수 → 포맷 폴백)을 검증한다.
 */

interface CanvasCall {
  width: number
  height: number
  type: string
}

const canvasCalls: CanvasCall[] = []
let webpSupported = true
let bitmapSize = { width: 1024, height: 768 }
const closeBitmap = vi.fn()

beforeEach(() => {
  canvasCalls.length = 0
  webpSupported = true
  bitmapSize = { width: 1024, height: 768 }
  closeBitmap.mockClear()

  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ ...bitmapSize, close: closeBitmap }))
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (
    this: HTMLCanvasElement,
    type?: string
  ) {
    canvasCalls.push({ width: this.width, height: this.height, type: type ?? 'image/png' })
    if (type === 'image/webp' && !webpSupported) return 'data:image/png;base64,UNSUPPORTED'
    return `data:${type ?? 'image/png'};base64,QUJD`
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function makeImageFile(bytes = 1024, type = 'image/jpeg', name = 'photo.jpg'): File {
  return new File([new ArrayBuffer(bytes)], name, { type })
}

describe('scaleToFit', () => {
  it('긴 변을 maxDim에 맞추고 비율을 유지한다', () => {
    expect(scaleToFit(1024, 768, 256)).toEqual({ width: 256, height: 192 })
    expect(scaleToFit(768, 1024, 256)).toEqual({ width: 192, height: 256 })
  })

  it('원본이 maxDim보다 작으면 업스케일하지 않는다', () => {
    expect(scaleToFit(100, 80, 256)).toEqual({ width: 100, height: 80 })
  })

  it('0 이하 치수는 1px로 방어한다', () => {
    expect(scaleToFit(0, 0, 256)).toEqual({ width: 1, height: 1 })
  })
})

describe('resizeAvatarImage', () => {
  it('이미지가 아닌 파일은 not_image로 거부한다', async () => {
    const err = await resizeAvatarImage(makeImageFile(10, 'text/plain', 'a.txt')).catch((e) => e)
    expect(err).toBeInstanceOf(AvatarImageError)
    expect((err as AvatarImageError).code).toBe('not_image')
  })

  it('5MB를 넘는 원본은 too_large로 거부한다', async () => {
    const err = await resizeAvatarImage(makeImageFile(AVATAR_UPLOAD_MAX_BYTES + 1)).catch((e) => e)
    expect(err).toBeInstanceOf(AvatarImageError)
    expect((err as AvatarImageError).code).toBe('too_large')
  })

  it('긴 변을 256px로 줄여 WebP data URL을 돌려주고 비트맵을 해제한다', async () => {
    const result = await resizeAvatarImage(makeImageFile())
    expect(result.startsWith('data:image/webp')).toBe(true)
    expect(canvasCalls[0]).toEqual({
      width: AVATAR_RESIZE_MAX_DIM,
      height: 192,
      type: 'image/webp',
    })
    expect(closeBitmap).toHaveBeenCalled()
  })

  it('원본이 256px보다 작으면 원본 치수를 유지한다', async () => {
    bitmapSize = { width: 100, height: 80 }
    await resizeAvatarImage(makeImageFile())
    expect(canvasCalls[0]).toMatchObject({ width: 100, height: 80 })
  })

  it('WebP 인코딩이 미지원이면 JPEG로 폴백한다', async () => {
    webpSupported = false
    const result = await resizeAvatarImage(makeImageFile())
    expect(result.startsWith('data:image/jpeg')).toBe(true)
    expect(canvasCalls.map((c) => c.type)).toEqual(['image/webp', 'image/jpeg'])
  })

  it('디코드 실패는 process_failed로 감싼다', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('broken image')
      })
    )
    const err = await resizeAvatarImage(makeImageFile()).catch((e) => e)
    expect(err).toBeInstanceOf(AvatarImageError)
    expect((err as AvatarImageError).code).toBe('process_failed')
  })
})

describe('resizePostImage', () => {
  it('svg 파일은 svg_not_allowed로 거부한다 (XSS 면)', async () => {
    const err = await resizePostImage(makeImageFile(10, 'image/svg+xml', 'a.svg')).catch((e) => e)
    expect(err).toBeInstanceOf(AvatarImageError)
    expect((err as AvatarImageError).code).toBe('svg_not_allowed')
  })

  it('이미지가 아닌 파일은 not_image로 거부한다', async () => {
    const err = await resizePostImage(makeImageFile(10, 'application/pdf', 'a.pdf')).catch((e) => e)
    expect(err).toBeInstanceOf(AvatarImageError)
    expect((err as AvatarImageError).code).toBe('not_image')
  })

  it('2MB를 넘는 원본은 too_large로 거부한다', async () => {
    const err = await resizePostImage(makeImageFile(POST_IMAGE_UPLOAD_MAX_BYTES + 1)).catch(
      (e) => e
    )
    expect(err).toBeInstanceOf(AvatarImageError)
    expect((err as AvatarImageError).code).toBe('too_large')
  })

  it('긴 변을 1600px로 줄여 data URL을 돌려준다', async () => {
    bitmapSize = { width: 4000, height: 3000 }
    const result = await resizePostImage(makeImageFile())
    expect(result.startsWith('data:image/webp')).toBe(true)
    expect(canvasCalls[0]).toEqual({
      width: POST_IMAGE_RESIZE_MAX_DIM,
      height: 1200,
      type: 'image/webp',
    })
  })
})
