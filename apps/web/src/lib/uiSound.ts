type ToneTuple = [frequency: number, startOffset: number, duration: number]
type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext }

const UI_SOUND_STORAGE_KEY = 'rotifolk-ui-audio'
const UI_SOUND_DEFAULT = true

let bangTickContext: AudioContext | null = null

function readFromStorage(raw: string | null): boolean {
  if (raw == null) return UI_SOUND_DEFAULT
  if (raw === '0') return false
  if (raw === '1') return true
  if (raw.toLowerCase() === 'false') return false
  if (raw.toLowerCase() === 'true') return true
  if (raw === 'off') return false
  if (raw === 'on') return true
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return numeric !== 0
  return UI_SOUND_DEFAULT
}

export function isUiAudioEnabled(): boolean {
  if (typeof window === 'undefined') return UI_SOUND_DEFAULT

  try {
    const raw = window.localStorage.getItem(UI_SOUND_STORAGE_KEY)
    return readFromStorage(raw)
  } catch {
    return UI_SOUND_DEFAULT
  }
}

export function playBangTick(): void {
  try {
    if (!isUiAudioEnabled()) return

    const Ctor = globalThis.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
    if (!Ctor) return
    bangTickContext ??= new Ctor()
    if (bangTickContext.state === 'suspended') void bangTickContext.resume()
    const now = bangTickContext.currentTime
    const tones: ToneTuple[] = [
      [780, 0, 0.07],
      [1000, 0.04, 0.08],
    ]

    for (const [freq, offset, duration] of tones) {
      const osc = bangTickContext.createOscillator()
      const gain = bangTickContext.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.11, now + offset + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration)
      osc.connect(gain)
      gain.connect(bangTickContext.destination)
      osc.start(now + offset)
      osc.stop(now + offset + duration)
    }
  } catch {
    // 오디오 미지원/차단 환경에서는 무시
  }
}
