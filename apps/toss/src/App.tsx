import { PartyDetailPage } from './pages/PartyDetailPage.tsx'
import { PartyListPage } from './pages/PartyListPage.tsx'
import { useHashPath } from './router'

export function App() {
  const path = useHashPath()
  const m = path.match(/^\/party\/(.+)$/)
  if (m) return <PartyDetailPage id={decodeURIComponent(m[1])} />
  return <PartyListPage />
}
