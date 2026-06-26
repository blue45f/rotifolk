import { PartyDetailPage } from './pages/PartyDetailPage.tsx'
import { PartyListPage } from './pages/PartyListPage.tsx'
import { useAuthBootstrap } from './domains/auth/hooks'
import IntroSplashScreen from './components/IntroSplashScreen.tsx'
import { useAmbientBgm } from './domains/ambient/useAmbientBgm'
import { useGlobalUiClickSound } from './shared/hooks/useGlobalUiClickSound'
import { useRoute } from './router'
import { useMemo, useState } from 'react'

function AmbientDock() {
  const ambient = useAmbientBgm()
  const [isOpen, setIsOpen] = useState(false)

  if (!ambient.isSupported) {
    return null
  }

  const volumePercent = useMemo(() => Math.round(ambient.volume * 100), [ambient.volume])
  const panelLabel = ambient.isEnabled ? '배경음이 켜져 있어요' : '배경음이 꺼져 있어요'

  return (
    <div className="toss-ambient-dock">
      <button
        type="button"
        className="toss-ambient-main"
        onClick={() => ambient.toggle()}
        aria-label={ambient.isEnabled ? '배경음끄기' : '배경음켜기'}
        aria-pressed={ambient.isEnabled}
      >
        {ambient.isEnabled ? '🎶' : '🔇'}
      </button>
      <button
        type="button"
        className="toss-ambient-open"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? '배경음 설정 접기' : '배경음 설정 펼치기'}
      >
        {isOpen ? '펼침' : '설정'}
      </button>

      {isOpen ? (
        <div className="toss-ambient-panel" role="group" aria-label="배경음 패널">
          <p className="toss-ambient-title">{panelLabel}</p>
          <p className="toss-ambient-subtitle">트랙: {ambient.trackLabel}</p>
          <label className="toss-ambient-range-wrap" htmlFor="toss-ambient-range">
            음량 {volumePercent}%
            <input
              id="toss-ambient-range"
              className="toss-ambient-range"
              type="range"
              min="0.12"
              max="1"
              step="0.01"
              value={ambient.volume}
              onChange={(event) => {
                ambient.setVolume(Number(event.target.value))
              }}
            />
          </label>
          <div className="toss-ambient-actions">
            <button
              type="button"
              onClick={() => ambient.nextTrack()}
              className="toss-ambient-action"
            >
              다음 배경음
            </button>
            <button type="button" onClick={() => ambient.toggle()} className="toss-ambient-action">
              {ambient.isEnabled ? '음악 끄기' : '음악 켜기'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function App() {
  useAuthBootstrap()
  useGlobalUiClickSound({ enabled: true })
  const route = useRoute()
  const content =
    route.kind === 'party' && route.partyId ? (
      <PartyDetailPage id={route.partyId} />
    ) : (
      <PartyListPage />
    )

  return (
    <>
      <IntroSplashScreen />
      <AmbientDock />
      {content}
    </>
  )
}
