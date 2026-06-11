import { AVATAR_IMAGE_MAX_LENGTH } from '@rotifolk/shared'

/** 원본 업로드 허용 상한 — 이보다 크면 리사이즈 전에 거부한다. */
export const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
/** 리사이즈 목표 — 긴 변 기준(px). 아바타 최대 표시 96px라 256px이면 레티나까지 충분. */
export const AVATAR_RESIZE_MAX_DIM = 256
export const AVATAR_RESIZE_QUALITY = 0.85

export type AvatarImageErrorCode = 'not_image' | 'too_large' | 'process_failed'

const ERROR_MESSAGE: Record<AvatarImageErrorCode, string> = {
  not_image: '이미지 파일만 올릴 수 있어요 (jpg·png·webp 등)',
  too_large: '사진이 5MB를 넘어요. 조금 더 작은 사진으로 시도해 주세요.',
  process_failed: '사진을 처리하지 못했어요. 다른 사진으로 다시 시도해 주세요.',
}

export class AvatarImageError extends Error {
  constructor(public readonly code: AvatarImageErrorCode) {
    super(ERROR_MESSAGE[code])
    this.name = 'AvatarImageError'
  }
}

/** 긴 변이 maxDim을 넘지 않도록 비율 유지 축소한다(작은 원본은 업스케일하지 않음). */
export function scaleToFit(
  width: number,
  height: number,
  maxDim: number = AVATAR_RESIZE_MAX_DIM,
): { width: number; height: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= 0) return { width: 1, height: 1 }
  const ratio = Math.min(1, maxDim / longEdge)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

interface Drawable {
  width: number
  height: number
  source: CanvasImageSource
  cleanup: () => void
}

/** 파일을 그릴 수 있는 소스로 디코드 — createImageBitmap 우선, 미지원 시 <img> 폴백. */
async function loadDrawable(file: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      cleanup: () => bitmap.close(),
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image decode failed'))
      el.src = url
    })
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      // cleanup은 drawImage 이후 호출되므로 그때 URL을 해제해도 안전하다.
      source: img,
      cleanup: () => URL.revokeObjectURL(url),
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

/**
 * 아바타 업로드 파이프라인 — 검증 → canvas 리사이즈(긴 변 256px) → data URL.
 * WebP(품질 0.85) 우선, 미지원 브라우저는 JPEG 폴백. 결과는 보통 수십 KB.
 * 실패 시 사용자에게 보여줄 한국어 메시지를 담은 AvatarImageError를 던진다.
 */
export async function resizeAvatarImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AvatarImageError('not_image')
  if (file.size > AVATAR_UPLOAD_MAX_BYTES) throw new AvatarImageError('too_large')

  let drawable: Drawable
  try {
    drawable = await loadDrawable(file)
  } catch {
    throw new AvatarImageError('process_failed')
  }

  try {
    const { width, height } = scaleToFit(drawable.width, drawable.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d unavailable')
    // JPEG 폴백 시 투명 영역이 검정으로 깔리지 않도록 흰 배경을 먼저 채운다.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(drawable.source, 0, 0, width, height)

    let dataUrl = canvas.toDataURL('image/webp', AVATAR_RESIZE_QUALITY)
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', AVATAR_RESIZE_QUALITY)
    }
    if (!dataUrl.startsWith('data:image/') || dataUrl.length > AVATAR_IMAGE_MAX_LENGTH) {
      throw new Error('encode failed')
    }
    return dataUrl
  } catch {
    throw new AvatarImageError('process_failed')
  } finally {
    drawable.cleanup()
  }
}
