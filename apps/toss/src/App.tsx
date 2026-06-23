import { PartyDetailPage } from './pages/PartyDetailPage.tsx'
import { PartyListPage } from './pages/PartyListPage.tsx'
import { useHashPath } from './router'
import IntroSplashScreen from './components/IntroSplashScreen.tsx'

export function App() {
  const path = useHashPath()
  const m = path.match(/^\/party\/(.+)$/)
  const content = m ? <PartyDetailPage id={decodeURIComponent(m[1])} /> : <PartyListPage />

  return (
    <>
      <IntroSplashScreen />
      {content}
    </>
  )
}
