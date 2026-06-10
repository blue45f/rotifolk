import { useCallback, useState } from 'react'

/** 호스트 타이밍 운영 설정 — 파티별 localStorage 저장(새로고침해도 유지). */
export interface TimingSettings {
  /** 시작 지연 누적 분 */
  delayMin: number
  /** 종료 시각 고정(역산) 모드 */
  fixedEndEnabled: boolean
  /** 고정 종료 시각 "HH:mm" */
  fixedEndHHmm: string
  /** 역산에 쓸 라운드 수 (null이면 파티 설정값 사용) */
  fixedEndRounds: number | null
  /** N라운드마다 긴 휴식 (0이면 규칙 없음) */
  breakEveryN: number
  /** 긴 휴식 분 */
  breakMin: number
  /** 라운드 종료 차임+알림 */
  alarmOn: boolean
}

const DEFAULTS: TimingSettings = {
  delayMin: 0,
  fixedEndEnabled: false,
  fixedEndHHmm: '',
  fixedEndRounds: null,
  breakEveryN: 0,
  breakMin: 10,
  alarmOn: false,
}

const storageKey = (partyId: string) => `rotifolk-timing-${partyId}`

function load(partyId: string): TimingSettings {
  try {
    const raw = localStorage.getItem(storageKey(partyId))
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<TimingSettings>) }
  } catch {
    return DEFAULTS
  }
}

export function usePartyTimingSettings(partyId: string | undefined) {
  const [settings, setSettings] = useState<TimingSettings>(() =>
    partyId ? load(partyId) : DEFAULTS,
  )

  const update = useCallback(
    (patch: Partial<TimingSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        if (partyId) {
          try {
            localStorage.setItem(storageKey(partyId), JSON.stringify(next))
          } catch {
            // 저장 실패해도 세션 내 동작은 유지
          }
        }
        return next
      })
    },
    [partyId],
  )

  return { settings, update }
}
