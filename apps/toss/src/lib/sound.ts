import { isUiAudioEnabled } from '@/domains/sound/useUiAudio'
type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext }

type Tone = [frequency: number, startOffset: number, duration: number]
let audioContext: AudioContext | null = null

function isAudioContextSupported(): boolean {
  return (
    typeof globalThis.AudioContext !== 'undefined' ||
    typeof (globalThis as unknown as WindowWithWebkitAudio).webkitAudioContext !== 'undefined'
  )
}

function isUiAudioAllowed(): boolean {
  return isUiAudioEnabled()
}

function getContext(): AudioContext {
  if (audioContext) return audioContext

  const Ctor = globalThis.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
  if (!Ctor) {
    throw new Error('AudioContext is not supported')
  }

  audioContext = new Ctor()
  return audioContext
}

export function playBangTick(): void {
  try {
    if (!isUiAudioAllowed()) return
    if (!isAudioContextSupported()) return
    const ctx = getContext()
    if (ctx.state === 'suspended') void ctx.resume()

    const now = ctx.currentTime
    const tones: Tone[] = [
      [780, 0, 0.07],
      [1000, 0.04, 0.08],
    ]

    for (const [freq, offset, duration] of tones) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.11, now + offset + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + duration)
    }
  } catch {
    // 사용자 설정상태를 방해하지 않기 위해 오디오 실패는 조용히 무시
  }
}
