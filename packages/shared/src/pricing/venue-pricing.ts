import type { Venue } from '../domain/venue'
import type { VenueQuote } from '../domain/venue-booking'

/** 플랫폼 수수료율 (정보 표기용 — 호스트 결제액에는 포함하지 않음). */
export const PLATFORM_FEE_RATE = 0.1

const MS_PER_HOUR = 3_600_000

/** 라스트미닛 할인율 — 시작 6h내 5%, 3h내 10%, 1h내 15% (offhours 참고). */
export function lastMinuteDiscountRate(
  startAt: Date | string,
  now: Date | string = new Date(),
): number {
  const diffH = (new Date(startAt).getTime() - new Date(now).getTime()) / MS_PER_HOUR
  if (diffH <= 0 || diffH > 6) return 0
  if (diffH <= 1) return 0.15
  if (diffH <= 3) return 0.1
  return 0.05
}

/** 취소 환불율 — 7일전 100%, 3일전 50%, 1일전 20%, 당일 0%. */
export function venueRefundRate(startAt: Date | string, now: Date | string = new Date()): number {
  const diffH = (new Date(startAt).getTime() - new Date(now).getTime()) / MS_PER_HOUR
  if (diffH >= 168) return 1
  if (diffH >= 72) return 0.5
  if (diffH >= 24) return 0.2
  return 0
}

// 주말/피크 판정은 한국 현지(KST, UTC+9) 기준이어야 실행 환경(TZ)과 무관하게 결정적이다.
const KST_OFFSET_MS = 9 * MS_PER_HOUR

/** instant를 KST 벽시계로 환산한 Date(getUTC* 로 KST 요일/시각을 읽는다). */
function toKst(d: Date): Date {
  return new Date(d.getTime() + KST_OFFSET_MS)
}

function isWeekend(d: Date): boolean {
  const wd = toKst(d).getUTCDay()
  return wd === 0 || wd === 6
}

/** 피크 = 금·토 저녁 18시 이후 (KST 기준). */
function isPeak(d: Date): boolean {
  const k = toKst(d)
  const wd = k.getUTCDay()
  return (wd === 5 || wd === 6) && k.getUTCHours() >= 18
}

type PriceableVenue = Pick<
  Venue,
  'pricePerHourKRW' | 'cleaningFeeKRW' | 'weekendMultiplier' | 'peakMultiplier'
>

export interface QuoteVenueOptions {
  now?: Date | string
}

/**
 * 대관 견적. 시간 × 단가 × 배수(주말/피크 중 큰 것 하나) − 막판할인 + 청소비.
 * totalKRW는 호스트가 공간에 지불하는 금액. feeKRW는 정보 표기용.
 */
export function quoteVenueBooking(
  venue: PriceableVenue,
  startAt: Date | string,
  endAt: Date | string,
  opts: QuoteVenueOptions = {},
): VenueQuote {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const now = opts.now ?? new Date()

  const rawHours = Math.max(0, (end.getTime() - start.getTime()) / MS_PER_HOUR)
  const hours = Math.round(rawHours * 2) / 2 // 30분 단위

  const weekendApplied = isWeekend(start) && venue.weekendMultiplier > 1
  const peakApplied = isPeak(start) && venue.peakMultiplier > 1
  let multiplier = 1
  if (weekendApplied) multiplier = Math.max(multiplier, venue.weekendMultiplier)
  if (peakApplied) multiplier = Math.max(multiplier, venue.peakMultiplier)

  const baseKRW = Math.round(venue.pricePerHourKRW * hours * multiplier)
  const lastMinuteRate = lastMinuteDiscountRate(start, now)
  const discountKRW = Math.round(baseKRW * lastMinuteRate)
  const cleaningFeeKRW = venue.cleaningFeeKRW ?? 0
  const subtotalKRW = baseKRW - discountKRW + cleaningFeeKRW
  const feeKRW = Math.round(subtotalKRW * PLATFORM_FEE_RATE)

  return {
    hours,
    baseKRW,
    multiplier,
    weekendApplied,
    peakApplied,
    lastMinuteRate,
    discountKRW,
    cleaningFeeKRW,
    subtotalKRW,
    feeKRW,
    totalKRW: subtotalKRW,
  }
}

/** "120,000원" */
export function formatKRW(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}
