import type { ID, ISODateString, Timestamps } from './common'

export type OrderKind = 'drink' | 'snack' | 'dessert' | 'glassware' | 'custom'

/**
 * 메뉴 제공 방식.
 * - `paid`      잔당/접시당 결제. 수량 조절·합계 합산.
 * - `included`  파티 패키지에 1인 1개 포함. 0원 OrderItem으로 기록.
 * - `unlimited` 시간 내 무제한 리필. "한 잔 더 (무료)" 단일 클릭, 합계에 미포함.
 * - `course`    셰프/호스트가 정해진 시점에 코스로 제공. 참가자는 발주 불가, 상태만 노출.
 */
export type MenuAvailability = 'paid' | 'included' | 'unlimited' | 'course'

export type OrderStatus = 'requested' | 'accepted' | 'preparing' | 'served' | 'cancelled'

export interface MenuItem {
  id: ID
  venueId: ID
  kind: OrderKind
  name: string
  description?: string | null
  priceKRW: number
  availability: MenuAvailability
  /** course일 때 진행 순서 (1부터). 그 외 null. */
  coursePosition?: number | null
  /** 1인 1회 제한 등 (없으면 null). */
  perPersonLimit?: number | null
  imageUrl?: string | null
  isAvailable: boolean
}

export interface OrderItem {
  menuItemId: ID
  name: string
  quantity: number
  priceKRW: number
  /** 결제 합산 대상이면 true. unlimited/course/included는 false. */
  billable: boolean
  availability: MenuAvailability
  note?: string | null
}

export interface Order extends Timestamps {
  id: ID
  partyId: ID
  userId: ID
  seatLabel?: string | null
  items: OrderItem[]
  /** billable=true 항목의 합계만. */
  totalKRW: number
  status: OrderStatus
  requestedAt: ISODateString
  servedAt?: ISODateString | null
  note?: string | null
}
