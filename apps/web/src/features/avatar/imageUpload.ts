import { AVATAR_IMAGE_MAX_LENGTH, POST_IMAGE_MAX_LENGTH } from '@rotifolk/shared'

/** 원본 업로드 허용 상한 — 이보다 크면 리사이즈 전에 거부한다. */
export const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
/** 리사이즈 목표 — 긴 변 기준(px). 아바타 최대 표시 96px라 256px이면 레티나까지 충분. */
export const AVATAR_RESIZE_MAX_DIM = 256
export const AVATAR_RESIZE_QUALITY = 0.85

/** 게시글 첨부 원본 상한 — 2MB. 모바일 사진도 보통 리사이즈 후 수백 KB로 줄어든다. */
export const POST_IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024
/** 게시글 첨부 리사이즈 목표 — 본문 폭 기준 레티나까지 커버하는 긴 변 1600px. */
export const POST_IMAGE_RESIZE_MAX_DIM = 1600

export type AvatarImageErrorCode = 'not_image' | 'svg_not_allowed' | 'too_large' | 'process_failed'

const ERROR_MESSAGE: Record<AvatarImageErrorCode, string> = {
  not_image: '이미지 파일만 올릴 수 있어요 (jpg·png·webp 등)',
  svg_not_allowed: 'svg는 올릴 수 없어요. jpg·png·webp 같은 사진 포맷을 사용해 주세요.',
  too_large: '사진 용량이 커요. 조금 더 작은 사진으로 시도해 주세요.',
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
  maxDim: number = AVATAR_RESIZE_MAX_DIM
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

interface ResizeOptions {
  /** 원본 파일 크기 상한(byte). */
  maxBytes: number
  /** 리사이즈 목표 — 긴 변(px). */
  maxDim: number
  /** 인코딩 품질 후보 — 앞에서부터 시도해 길이 캡을 통과하는 첫 결과를 쓴다. */
  qualities: readonly number[]
  /** 결과 data URL 길이 캡(서버 zod 캡과 동일 경계). */
  maxLength: number
}

/**
 * 공용 리사이즈 파이프라인 — 검증 → canvas 축소 → data URL 인코딩.
 * WebP 우선, 미지원 브라우저는 JPEG 폴백. svg는 스크립트 실행 면이 있어 거부한다.
 * 실패 시 사용자에게 보여줄 한국어 메시지를 담은 AvatarImageError를 던진다.
 */
async function resizeImageToDataUrl(file: File, options: ResizeOptions): Promise<string> {
  if (file.type === 'image/svg+xml') throw new AvatarImageError('svg_not_allowed')
  if (!file.type.startsWith('image/')) throw new AvatarImageError('not_image')
  if (file.size > options.maxBytes) throw new AvatarImageError('too_large')

  let drawable: Drawable
  try {
    drawable = await loadDrawable(file)
  } catch {
    throw new AvatarImageError('process_failed')
  }

  try {
    const { width, height } = scaleToFit(drawable.width, drawable.height, options.maxDim)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d unavailable')
    // JPEG 폴백 시 투명 영역이 검정으로 깔리지 않도록 흰 배경을 먼저 채운다.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(drawable.source, 0, 0, width, height)

    for (const quality of options.qualities) {
      let dataUrl = canvas.toDataURL('image/webp', quality)
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }
      if (dataUrl.startsWith('data:image/') && dataUrl.length <= options.maxLength) {
        return dataUrl
      }
    }
    throw new Error('encode failed')
  } catch {
    throw new AvatarImageError('process_failed')
  } finally {
    drawable.cleanup()
  }
}

/**
 * 아바타 업로드 파이프라인 — 긴 변 256px, 품질 0.85. 결과는 보통 수십 KB.
 */
export async function resizeAvatarImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AvatarImageError('not_image')
  if (file.size > AVATAR_UPLOAD_MAX_BYTES) throw new AvatarImageError('too_large')
  return resizeImageToDataUrl(file, {
    maxBytes: AVATAR_UPLOAD_MAX_BYTES,
    maxDim: AVATAR_RESIZE_MAX_DIM,
    qualities: [AVATAR_RESIZE_QUALITY],
    maxLength: AVATAR_IMAGE_MAX_LENGTH,
  })
}

/**
 * 게시글 첨부 파이프라인 — 원본 2MB 캡, 긴 변 1600px.
 * 길이 캡(서버 zod와 동일)을 넘으면 품질을 한 단계씩 낮춰 재시도한다.
 */
export async function resizePostImage(file: File): Promise<string> {
  return resizeImageToDataUrl(file, {
    maxBytes: POST_IMAGE_UPLOAD_MAX_BYTES,
    maxDim: POST_IMAGE_RESIZE_MAX_DIM,
    qualities: [0.82, 0.7, 0.55],
    maxLength: POST_IMAGE_MAX_LENGTH,
  })
}
