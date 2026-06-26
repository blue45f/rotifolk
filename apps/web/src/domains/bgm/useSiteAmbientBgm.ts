import { useCallback, useEffect, useState } from 'react'

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext }

const BGM_STORAGE_KEY = 'rotifolk-site-ambient-bgm'
const BGM_VOLUME_KEY = 'rotifolk-site-ambient-bgm-volume'
const BGM_TRACK_KEY = 'rotifolk-site-ambient-bgm-track'
const BGM_STORAGE_DEFAULT = 'off'
const TARGET_MASTER_GAIN = 0.018
const VOLUME_MIN = 0.12
const VOLUME_MAX = 1
const DEFAULT_VOLUME = 0.48
const TRACK_ROTATION_INTERVAL_MS = 75_000
const DEFAULT_TRACK_INDEX = 0

type OscillatorPreset = {
  type: OscillatorType
  base: number
  target: number
  duration: number
  gain: number
}

type AmbientTrackPreset = {
  id: string
  label: string
  lowpassFrequency: number
  lowpassQ: number
  toneA: OscillatorPreset
  toneB: OscillatorPreset
  toneC: OscillatorPreset
  lfoFrequency: number
  lfoDepth: number
  noiseFilterFrequency: number
  noiseFilterQ: number
  noiseGain: number
}

const AMBIENT_PRESETS: AmbientTrackPreset[] = [
  {
    id: 'dawn-breeze',
    label: '안개 바람',
    lowpassFrequency: 330,
    lowpassQ: 0.7,
    toneA: { type: 'sine', base: 54, target: 65, duration: 26, gain: 0.9 },
    toneB: { type: 'triangle', base: 84, target: 97, duration: 28, gain: 0.46 },
    toneC: { type: 'triangle', base: 112, target: 118, duration: 30, gain: 0.28 },
    lfoFrequency: 0.065,
    lfoDepth: 9,
    noiseFilterFrequency: 860,
    noiseFilterQ: 0.64,
    noiseGain: 0.03,
  },
  {
    id: 'soft-lagoon',
    label: '잔잔한 라군',
    lowpassFrequency: 360,
    lowpassQ: 0.8,
    toneA: { type: 'sine', base: 48, target: 58, duration: 31, gain: 0.8 },
    toneB: { type: 'sine', base: 72, target: 82, duration: 34, gain: 0.42 },
    toneC: { type: 'triangle', base: 99, target: 108, duration: 32, gain: 0.3 },
    lfoFrequency: 0.05,
    lfoDepth: 8,
    noiseFilterFrequency: 840,
    noiseFilterQ: 0.58,
    noiseGain: 0.032,
  },
  {
    id: 'night-ember',
    label: '은은한 저녁',
    lowpassFrequency: 290,
    lowpassQ: 0.62,
    toneA: { type: 'triangle', base: 64, target: 77, duration: 22, gain: 0.94 },
    toneB: { type: 'sawtooth', base: 86, target: 102, duration: 29, gain: 0.4 },
    toneC: { type: 'triangle', base: 124, target: 138, duration: 34, gain: 0.26 },
    lfoFrequency: 0.074,
    lfoDepth: 8.5,
    noiseFilterFrequency: 720,
    noiseFilterQ: 0.7,
    noiseGain: 0.028,
  },
  {
    id: 'clear-sky',
    label: '맑은 하늘',
    lowpassFrequency: 380,
    lowpassQ: 0.75,
    toneA: { type: 'sine', base: 52, target: 64, duration: 24, gain: 0.88 },
    toneB: { type: 'sine', base: 78, target: 92, duration: 27, gain: 0.45 },
    toneC: { type: 'triangle', base: 118, target: 126, duration: 36, gain: 0.31 },
    lfoFrequency: 0.052,
    lfoDepth: 7.5,
    noiseFilterFrequency: 930,
    noiseFilterQ: 0.6,
    noiseGain: 0.026,
  },
  {
    id: 'misty-forest',
    label: '숲 안개',
    lowpassFrequency: 305,
    lowpassQ: 0.86,
    toneA: { type: 'triangle', base: 58, target: 69, duration: 31, gain: 0.86 },
    toneB: { type: 'triangle', base: 96, target: 108, duration: 28, gain: 0.52 },
    toneC: { type: 'sine', base: 125, target: 136, duration: 35, gain: 0.24 },
    lfoFrequency: 0.04,
    lfoDepth: 10,
    noiseFilterFrequency: 760,
    noiseFilterQ: 0.68,
    noiseGain: 0.034,
  },
  {
    id: 'cozy-night',
    label: '늦은 밤 카페',
    lowpassFrequency: 450,
    lowpassQ: 0.92,
    toneA: { type: 'sine', base: 70, target: 84, duration: 26, gain: 0.9 },
    toneB: { type: 'triangle', base: 92, target: 108, duration: 29, gain: 0.42 },
    toneC: { type: 'triangle', base: 108, target: 122, duration: 34, gain: 0.33 },
    lfoFrequency: 0.06,
    lfoDepth: 8.2,
    noiseFilterFrequency: 980,
    noiseFilterQ: 0.62,
    noiseGain: 0.028,
  },
  {
    id: 'sunset-harbor',
    label: '항구 노을',
    lowpassFrequency: 300,
    lowpassQ: 0.74,
    toneA: { type: 'sawtooth', base: 44, target: 56, duration: 33, gain: 0.94 },
    toneB: { type: 'triangle', base: 63, target: 76, duration: 27, gain: 0.39 },
    toneC: { type: 'sine', base: 95, target: 108, duration: 32, gain: 0.22 },
    lfoFrequency: 0.031,
    lfoDepth: 9.4,
    noiseFilterFrequency: 710,
    noiseFilterQ: 0.53,
    noiseGain: 0.033,
  },
  {
    id: 'morning-rain',
    label: '부드러운 비',
    lowpassFrequency: 520,
    lowpassQ: 0.7,
    toneA: { type: 'sine', base: 46, target: 58, duration: 21, gain: 0.82 },
    toneB: { type: 'sine', base: 86, target: 99, duration: 25, gain: 0.44 },
    toneC: { type: 'triangle', base: 112, target: 124, duration: 30, gain: 0.28 },
    lfoFrequency: 0.089,
    lfoDepth: 7,
    noiseFilterFrequency: 1100,
    noiseFilterQ: 0.6,
    noiseGain: 0.04,
  },
  {
    id: 'city-swing',
    label: '네온 라운지',
    lowpassFrequency: 580,
    lowpassQ: 0.95,
    toneA: { type: 'sawtooth', base: 66, target: 86, duration: 25, gain: 0.95 },
    toneB: { type: 'triangle', base: 112, target: 128, duration: 28, gain: 0.42 },
    toneC: { type: 'square', base: 168, target: 192, duration: 34, gain: 0.22 },
    lfoFrequency: 0.07,
    lfoDepth: 9.5,
    noiseFilterFrequency: 900,
    noiseFilterQ: 0.52,
    noiseGain: 0.028,
  },
  {
    id: 'bright-beat',
    label: '브라이트 비트',
    lowpassFrequency: 760,
    lowpassQ: 0.82,
    toneA: { type: 'triangle', base: 72, target: 94, duration: 24, gain: 0.88 },
    toneB: { type: 'triangle', base: 126, target: 148, duration: 30, gain: 0.44 },
    toneC: { type: 'sine', base: 194, target: 220, duration: 36, gain: 0.2 },
    lfoFrequency: 0.11,
    lfoDepth: 11,
    noiseFilterFrequency: 820,
    noiseFilterQ: 0.66,
    noiseGain: 0.022,
  },
]

type AmbientNodeSet = {
  context: AudioContext
  master: GainNode
  lowpass: BiquadFilterNode
  toneA: OscillatorNode
  toneB: OscillatorNode
  toneC: OscillatorNode
  toneAGain: GainNode
  toneBGain: GainNode
  toneCGain: GainNode
  lfo: OscillatorNode
  lfoGain: GainNode
  noiseSource: AudioBufferSourceNode
  noiseFilter: BiquadFilterNode
  noiseGain: GainNode
  trackIndex: number
}

let sharedContext: AudioContext | null = null
let activeNodes: AmbientNodeSet | null = null
let activeTrackIndex: number | null = null
let clearStopTimer: number | NodeJS.Timeout | null = null

function isAudioContextSupported(): boolean {
  return (
    typeof globalThis.AudioContext !== 'undefined' ||
    typeof (globalThis as unknown as WindowWithWebkitAudio).webkitAudioContext !== 'undefined'
  )
}

function getContext(): AudioContext {
  if (sharedContext) return sharedContext

  const Ctor = globalThis.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
  if (!Ctor) {
    throw new Error('AudioContext unsupported')
  }
  sharedContext = new Ctor()
  return sharedContext
}

function clampTrackIndex(value: number): number {
  const total = AMBIENT_PRESETS.length
  if (total <= 0) return 0
  if (!Number.isFinite(value)) return DEFAULT_TRACK_INDEX

  const raw = Math.trunc(value)
  const normalized = ((raw % total) + total) % total
  return normalized
}

function nextTrackIndex(value: number): number {
  const total = AMBIENT_PRESETS.length
  if (total <= 0) return 0
  return (clampTrackIndex(value) + 1) % total
}

function createWindNoise(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate
  const length = Math.max(512, Math.floor(sampleRate * 2.2))
  const buffer = context.createBuffer(1, length, sampleRate)
  const channel = buffer.getChannelData(0)

  for (let i = 0; i < length; i += 1) {
    const v1 = i > 0 ? channel[i - 1] : 0
    const random = (Math.random() * 2 - 1) * 0.08
    channel[i] = (v1 * 0.985 + random) * 0.96
  }
  return buffer
}

function stopNode(node: { stop(time?: number): void; disconnect?: () => void }, when = 0.45) {
  const stopAt = (sharedContext?.currentTime ?? 0) + when
  try {
    node.stop(stopAt)
  } catch {}
  try {
    node.disconnect?.()
  } catch {}
}

function stopAmbientBgm() {
  if (!activeNodes) return
  const nodes = activeNodes
  activeNodes = null
  activeTrackIndex = null

  const now = nodes.context.currentTime
  nodes.master.gain.cancelScheduledValues(now)
  nodes.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)

  stopNode(nodes.toneA, now + 0.5)
  stopNode(nodes.toneB, now + 0.5)
  stopNode(nodes.toneC, now + 0.5)
  stopNode(nodes.lfo, now + 0.5)
  stopNode(nodes.noiseSource, now + 0.5)

  if (clearStopTimer != null) {
    clearTimeout(clearStopTimer)
  }

  clearStopTimer = window.setTimeout(() => {
    if (clearStopTimer != null) clearTimeout(clearStopTimer)
    clearStopTimer = null
  }, 520)
}

function startAmbientBgm(trackIndex = DEFAULT_TRACK_INDEX): boolean {
  if (!isAudioContextSupported()) return false
  const presetIndex = clampTrackIndex(trackIndex)
  const preset = AMBIENT_PRESETS[presetIndex]

  if (!preset) return false
  if (activeNodes && activeTrackIndex === presetIndex) return true
  if (activeNodes) stopAmbientBgm()

  try {
    const context = getContext()
    if (context.state === 'suspended') {
      void context.resume()
    }

    const now = context.currentTime
    const lowpass = context.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = preset.lowpassFrequency
    lowpass.Q.value = preset.lowpassQ

    const master = context.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(TARGET_MASTER_GAIN, now + 1.3)

    const toneA = context.createOscillator()
    const toneB = context.createOscillator()
    const toneC = context.createOscillator()

    toneA.type = preset.toneA.type
    toneB.type = preset.toneB.type
    toneC.type = preset.toneC.type

    toneA.frequency.value = preset.toneA.base
    toneB.frequency.value = preset.toneB.base
    toneC.frequency.value = preset.toneC.base

    toneA.frequency.exponentialRampToValueAtTime(preset.toneA.target, now + preset.toneA.duration)
    toneB.frequency.exponentialRampToValueAtTime(preset.toneB.target, now + preset.toneB.duration)
    toneC.frequency.exponentialRampToValueAtTime(preset.toneC.target, now + preset.toneC.duration)

    const toneAGain = context.createGain()
    const toneBGain = context.createGain()
    const toneCGain = context.createGain()
    toneAGain.gain.value = preset.toneA.gain
    toneBGain.gain.value = preset.toneB.gain
    toneCGain.gain.value = preset.toneC.gain

    const lfo = context.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = preset.lfoFrequency

    const lfoGain = context.createGain()
    lfoGain.gain.value = preset.lfoDepth

    const noiseSource = context.createBufferSource()
    noiseSource.buffer = createWindNoise(context)
    noiseSource.loop = true

    const noiseFilter = context.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = preset.noiseFilterFrequency
    noiseFilter.Q.value = preset.noiseFilterQ

    const noiseGain = context.createGain()
    noiseGain.gain.value = preset.noiseGain

    lfo.connect(lfoGain)
    lfoGain.connect(toneB.frequency)
    lfoGain.connect(toneC.frequency)

    toneA.connect(toneAGain)
    toneB.connect(toneBGain)
    toneC.connect(toneCGain)

    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(master)
    toneAGain.connect(master)
    toneBGain.connect(master)
    toneCGain.connect(master)
    master.connect(lowpass)
    lowpass.connect(context.destination)

    toneA.start(now)
    toneB.start(now)
    toneC.start(now)
    lfo.start(now)
    noiseSource.start(now)

    activeTrackIndex = presetIndex
    activeNodes = {
      context,
      master,
      lowpass,
      toneA,
      toneB,
      toneC,
      toneAGain,
      toneBGain,
      toneCGain,
      lfo,
      lfoGain,
      noiseSource,
      noiseFilter,
      noiseGain,
      trackIndex: presetIndex,
    }

    return true
  } catch {
    stopAmbientBgm()
    return false
  }
}

function readDefaultEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (!isAudioContextSupported()) return false
  try {
    return window.localStorage.getItem(BGM_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, value))
}

function clampVolume(value: number): number {
  return Math.min(VOLUME_MAX, Math.max(VOLUME_MIN, clamp01(value)))
}

function readDefaultVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME
  if (!isAudioContextSupported()) return DEFAULT_VOLUME
  try {
    const raw = window.localStorage.getItem(BGM_VOLUME_KEY)
    if (!raw) return DEFAULT_VOLUME
    return clampVolume(Number(raw))
  } catch {
    return DEFAULT_VOLUME
  }
}

function readDefaultTrack(): number {
  if (typeof window === 'undefined') return DEFAULT_TRACK_INDEX
  if (!isAudioContextSupported()) return DEFAULT_TRACK_INDEX
  try {
    const raw = window.localStorage.getItem(BGM_TRACK_KEY)
    if (!raw) return DEFAULT_TRACK_INDEX
    return clampTrackIndex(Number(raw))
  } catch {
    return DEFAULT_TRACK_INDEX
  }
}

export function useSiteAmbientBgm(
  enabled = true,
  isUiSoundEnabled = true
): {
  isEnabled: boolean
  volume: number
  trackIndex: number
  trackLabel: string
  isRunning: boolean
  isSupported: boolean
  setVolume: (volume: number) => void
  nextTrack: () => void
  toggle: () => void
  enable: () => void
  disable: () => void
} {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => readDefaultEnabled())
  const [volume, setVolumeState] = useState<number>(() => readDefaultVolume())
  const [trackIndex, setTrackIndex] = useState<number>(() => readDefaultTrack())
  const isSupported = isAudioContextSupported()
  const playbackEnabled = enabled && isUiSoundEnabled

  useEffect(() => {
    if (!activeNodes || !isEnabled) return

    try {
      const now = activeNodes.context.currentTime
      const targetGain = TARGET_MASTER_GAIN * clampVolume(volume)
      activeNodes.master.gain.cancelScheduledValues(now)
      activeNodes.master.gain.linearRampToValueAtTime(targetGain, now + 0.12)
    } catch {}
  }, [volume, isEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!playbackEnabled || !isEnabled) {
      stopAmbientBgm()
      return
    }

    const safeTrackIndex = clampTrackIndex(trackIndex)
    const started = startAmbientBgm(safeTrackIndex)
    if (started) {
      activeTrackIndex = safeTrackIndex
      return
    }

    const onUserAction = () => {
      const retried = startAmbientBgm(safeTrackIndex)
      if (retried) {
        activeTrackIndex = safeTrackIndex
      }
    }

    document.addEventListener('pointerdown', onUserAction, true)
    document.addEventListener('keydown', onUserAction, true)
    return () => {
      document.removeEventListener('pointerdown', onUserAction, true)
      document.removeEventListener('keydown', onUserAction, true)
    }
  }, [playbackEnabled, isEnabled, trackIndex])

  useEffect(() => {
    if (!playbackEnabled || !isEnabled) return

    const timer = window.setInterval(() => {
      setTrackIndex((current) => nextTrackIndex(current))
    }, TRACK_ROTATION_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [playbackEnabled, isEnabled])

  useEffect(() => {
    if (!playbackEnabled || !isEnabled) return

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopAmbientBgm()
        return
      }
      if (isEnabled) {
        const safeTrackIndex = clampTrackIndex(trackIndex)
        const started = startAmbientBgm(safeTrackIndex)
        if (started) {
          activeTrackIndex = safeTrackIndex
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [playbackEnabled, isEnabled, trackIndex])

  useEffect(() => {
    return () => stopAmbientBgm()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(BGM_VOLUME_KEY, String(clamp01(volume)))
    } catch {}
  }, [volume])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(BGM_TRACK_KEY, String(clampTrackIndex(trackIndex)))
    } catch {}
  }, [trackIndex])

  const persist = useCallback((value: boolean) => {
    if (typeof window === 'undefined') return
    try {
      if (value) {
        localStorage.setItem(BGM_STORAGE_KEY, '1')
      } else {
        localStorage.setItem(BGM_STORAGE_KEY, BGM_STORAGE_DEFAULT)
      }
    } catch {}
  }, [])

  const setVolume = useCallback((value: number) => {
    const normalized = clampVolume(value)
    setVolumeState(normalized)
    if (!activeNodes) return

    try {
      const now = activeNodes.context.currentTime
      const targetGain = TARGET_MASTER_GAIN * normalized
      activeNodes.master.gain.cancelScheduledValues(now)
      activeNodes.master.gain.linearRampToValueAtTime(targetGain, now + 0.08)
    } catch {}
  }, [])

  const nextTrack = useCallback(() => {
    setTrackIndex((current) => nextTrackIndex(current))
  }, [])

  const toggle = useCallback(() => {
    setIsEnabled((state) => {
      if (state) {
        persist(false)
        stopAmbientBgm()
        return false
      }

      persist(true)
      return true
    })
  }, [persist])

  const enable = useCallback(() => {
    setIsEnabled((state) => {
      if (state) return true
      persist(true)
      return true
    })
  }, [persist])

  const disable = useCallback(() => {
    setIsEnabled((state) => {
      if (!state) return false
      persist(false)
      stopAmbientBgm()
      return false
    })
  }, [persist])

  const safeTrackIndex = clampTrackIndex(trackIndex)
  const currentPreset = AMBIENT_PRESETS[safeTrackIndex]
  const isRunning = activeNodes !== null && isEnabled && playbackEnabled

  return {
    isEnabled,
    volume,
    trackIndex: safeTrackIndex,
    trackLabel: currentPreset?.label ?? '안개 바람',
    isRunning,
    isSupported,
    setVolume,
    nextTrack,
    toggle,
    enable,
    disable,
  }
}
