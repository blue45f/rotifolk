/**
 * 라운드 알람 — 라운드 종료 시 Web Audio 차임(의존성 0) + Notification API.
 * 권한 요청은 호스트가 알람 토글을 켤 때 1회만 일어난다.
 */

import {
  isUiAudioEnabled as isUiAudioSwitchEnabled,
  playBangTick as playBangTickSound,
} from '@/lib/uiSound'

let audioCtx: AudioContext | null = null

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext }

function isUiAudioAllowed(): boolean {
  return isUiAudioSwitchEnabled()
}

/** 짧은 2음 차임 (E5→A5) — 외부 에셋 없이 oscillator로 합성. */
export function playRoundChime(): void {
  try {
    if (!isUiAudioAllowed()) return
    const Ctor = globalThis.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
    if (!Ctor) return
    audioCtx ??= new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    const now = audioCtx.currentTime
    const tones: Array<[number, number]> = [
      [659.25, 0], // E5
      [880, 0.18], // A5
    ]
    for (const [freq, offset] of tones) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.55)
    }
  } catch {
    // 오디오 미지원/차단 환경 — 알람은 보조 수단이므로 조용히 무시
  }
}

/** 버튼/타이틀 bang에 맞는 짧은 클릭형 사운드(오디오 컨텍스트 재생용). */
export function playBangTick(): void {
  if (isUiAudioAllowed()) {
    playBangTickSound()
  }
}

/** 알람 토글 ON 시 1회 호출 — 허용 여부를 돌려준다. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export function notifyRoundEnded(partyTitle: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification('⏰ 라운드 종료', {
      body: `${partyTitle} — 다음 라운드를 시작해 주세요`,
      tag: 'rotifolk-round-alarm', // 같은 태그로 중복 알림 교체
    })
  } catch {
    // 일부 브라우저는 페이지 컨텍스트 생성 제한 — 무시
  }
}
