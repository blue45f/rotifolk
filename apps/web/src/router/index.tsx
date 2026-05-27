import { Suspense, lazy, type ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import RootLayout from '@components/layout/RootLayout'
import RouteError from '@components/feedback/RouteError'
import Loading from '@components/feedback/Loading'
import ProtectedRoute from './ProtectedRoute'

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const C = lazy(loader)
  return (
    <Suspense fallback={<Loading />}>
      <C />
    </Suspense>
  )
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: lazyPage(() => import('@pages/home/HomePage')) },
      { path: 'discover', element: lazyPage(() => import('@pages/discover/DiscoverPage')) },
      { path: 'neighborhood', element: lazyPage(() => import('@pages/neighborhood/NeighborhoodPage')) },
      { path: 'quick', element: lazyPage(() => import('@pages/quick/QuickCreatePage')) },
      { path: 'parties/:partyId', element: lazyPage(() => import('@pages/party/PartyDetailPage')) },
      { path: 'venues', element: lazyPage(() => import('@pages/venues/VenuesPage')) },
      { path: 'hosts/:hostId', element: lazyPage(() => import('@pages/host-profile/HostProfilePage')) },
      { path: 'match-card/:userId', element: lazyPage(() => import('@pages/match-card/MatchCardPage')) },
      { path: 'login', element: lazyPage(() => import('@pages/auth/LoginPage')) },
      { path: 'signup', element: lazyPage(() => import('@pages/auth/SignUpPage')) },
      {
        path: 'host',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/host/HostConsolePage')) },
          { path: 'create', element: lazyPage(() => import('@pages/host/HostCreatePage')) },
          { path: 'parties/:partyId', element: lazyPage(() => import('@pages/host/HostManagePage')) },
        ],
      },
      {
        path: 'live/:partyId',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/live/LivePartyPage')) }],
      },
      {
        path: 'me',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/profile/ProfilePage')) }],
      },
      {
        path: 'chats',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/chat/ChatListPage')) },
          { path: ':roomId', element: lazyPage(() => import('@pages/chat/ChatRoomPage')) },
        ],
      },
      {
        path: 'notifications',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/notifications/NotificationsPage')) }],
      },
      { path: 'search', element: lazyPage(() => import('@pages/search/SearchPage')) },
      { path: 'invite/:code', element: lazyPage(() => import('@pages/invite/InvitePage')) },
      {
        path: 'calendar',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/calendar/CalendarPage')) }],
      },
      {
        path: 'admin',
        element: <ProtectedRoute role="admin" />,
        children: [{ index: true, element: lazyPage(() => import('@pages/admin/AdminPage')) }],
      },
      { path: '*', element: lazyPage(() => import('@pages/notfound/NotFoundPage')) },
    ],
  },
]

export const router = createBrowserRouter(routes)
