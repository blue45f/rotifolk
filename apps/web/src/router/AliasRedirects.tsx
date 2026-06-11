import { Navigate, useLocation } from 'react-router-dom'

export function AliasHelpRedirect({
  topic,
  fromOverride,
}: {
  topic: 'host' | 'guest'
  fromOverride: string
}) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const returnPath = searchParams.get('from') ?? fromOverride
  searchParams.delete('topic')
  searchParams.delete('from')
  searchParams.set('from', returnPath)
  searchParams.set('topic', topic)
  const query = searchParams.toString()
  return <Navigate to={`/help${query ? `?${query}` : ''}`} replace />
}

export function AliasPoliciesRedirect({
  filter,
  section,
  fromOverride,
}: {
  filter: 'all' | 'required' | 'optional'
  section: 'refund' | 'cancel' | 'noshow' | 'privacy' | 'safety'
  fromOverride: string
}) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const returnPath = searchParams.get('from') ?? fromOverride
  searchParams.delete('filter')
  searchParams.delete('section')
  searchParams.delete('from')
  searchParams.set('from', returnPath)
  if (filter !== 'all') {
    searchParams.set('filter', filter)
  }
  searchParams.set('section', section)
  const query = searchParams.toString()
  return <Navigate to={`/policies${query ? `?${query}` : ''}`} replace />
}
