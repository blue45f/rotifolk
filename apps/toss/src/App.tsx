import { PartyDetailPage } from './pages/PartyDetailPage.tsx'
import { PartyListPage } from './pages/PartyListPage.tsx'
import { useRoute } from './router'
import { useAuthBootstrap } from './domains/auth/hooks'
import IntroSplashScreen from './components/IntroSplashScreen.tsx'

export function App() {
  useAuthBootstrap()
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
      {content}
    </>
  )
}
