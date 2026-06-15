import Loading from '@components/feedback/Loading'
import RouteError from '@components/feedback/RouteError'
import RootLayout from '@components/layout/RootLayout'
import { Suspense, lazy, type ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'

import { AliasHelpRedirect, AliasPoliciesRedirect } from './AliasRedirects'
import ProtectedRoute from './ProtectedRoute'

const CHUNK_RETRY_KEY = 'rotifolk-chunk-retry'

/**
 * `lazy()` with one-shot recovery for chunk-load failures (stale deploys).
 * The first failure marks sessionStorage and reloads to pick up fresh assets;
 * the marker survives the reload and is cleared only by a successful load, so
 * a genuinely broken chunk surfaces in the route error boundary instead of
 * looping reloads.
 */
function lazyRetry<T extends ComponentType>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      sessionStorage.removeItem(CHUNK_RETRY_KEY)
      return mod
    } catch (error) {
      if (!sessionStorage.getItem(CHUNK_RETRY_KEY)) {
        sessionStorage.setItem(CHUNK_RETRY_KEY, '1')
        window.location.reload()
        // Stay pending — the reload takes over this document.
        return new Promise<never>(() => {})
      }
      throw error
    }
  })
}

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const C = lazyRetry(loader)
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
      { path: 'category/:value', element: lazyPage(() => import('@pages/category/CategoryPage')) },
      { path: 'vibe', element: lazyPage(() => import('@pages/vibe/VibePage')) },
      { path: 'community', element: lazyPage(() => import('@pages/community/CommunityPage')) },
      { path: 'clubs', element: lazyPage(() => import('@pages/clubs/ClubsPage')) },
      {
        path: 'clubs/new',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/clubs/ClubCreatePage')) }],
      },
      {
        path: 'clubs/:clubId',
        element: lazyPage(() => import('@pages/clubs/ClubDetailPage')),
      },
      { path: 'support', element: lazyPage(() => import('@pages/support/SupportPage')) },
      {
        path: 'help/host',
        element: <AliasHelpRedirect topic="host" fromOverride="/help/host" />,
      },
      {
        path: 'help/guest',
        element: <AliasHelpRedirect topic="guest" fromOverride="/help/guest" />,
      },
      {
        path: 'neighborhood',
        element: lazyPage(() => import('@pages/neighborhood/NeighborhoodPage')),
      },
      { path: 'quick', element: lazyPage(() => import('@pages/quick/QuickCreatePage')) },
      { path: 'parties/:partyId', element: lazyPage(() => import('@pages/party/PartyDetailPage')) },
      { path: 'venues', element: lazyPage(() => import('@pages/venues/VenuesPage')) },
      { path: 'help', element: lazyPage(() => import('@pages/help/HelpPage')) },
      { path: 'tutorial', element: lazyPage(() => import('@pages/tutorial/TutorialPage')) },
      { path: 'design', element: lazyPage(() => import('@pages/design/DesignPage')) },
      { path: 'policies', element: lazyPage(() => import('@pages/policies/PoliciesPage')) },
      { path: 'terms', element: lazyPage(() => import('@pages/policy/PolicyPage')) },
      { path: 'privacy', element: lazyPage(() => import('@pages/policy/PolicyPage')) },
      { path: 'cancel-policy', element: lazyPage(() => import('@pages/policy/PolicyPage')) },
      {
        path: 'safety',
        element: (
          <AliasPoliciesRedirect filter="required" section="safety" fromOverride="/safety" />
        ),
      },
      {
        path: 'hosts/:hostId',
        element: lazyPage(() => import('@pages/host-profile/HostProfilePage')),
      },
      {
        path: 'match-card/:userId',
        element: lazyPage(() => import('@pages/match-card/MatchCardPage')),
      },
      {
        path: 'me/cards',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/match-cards/MatchCardsPage')) },
        ],
      },
      {
        path: 'me/follows',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/follows/FollowsPage')) }],
      },
      {
        path: 'me/saved',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/saved/SavedPartiesPage')) },
        ],
      },
      {
        path: 'me/payments',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/payments/PaymentsHistoryPage')) },
        ],
      },
      {
        path: 'me/blocks',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/blocks/BlockedUsersPage')) },
        ],
      },
      {
        path: 'me/notes',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/notes/NotesInboxPage')) }],
      },
      {
        path: 'me/profile-studio',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/profile/ProfileStudioPage')) },
        ],
      },
      { path: 'login', element: lazyPage(() => import('@pages/auth/LoginPage')) },
      { path: 'signup', element: lazyPage(() => import('@pages/auth/SignUpPage')) },
      {
        path: 'host',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/host/HostConsolePage')) },
          { path: 'create', element: lazyPage(() => import('@pages/host/HostCreatePage')) },
          { path: 'sourcing', element: lazyPage(() => import('@pages/sourcing/SourcingPage')) },
          { path: 'space', element: lazyPage(() => import('@pages/host/OwnerHostingPage')) },
          { path: 'venues/new', element: lazyPage(() => import('@pages/host/VenueRegisterPage')) },
          {
            path: 'parties/:partyId',
            element: lazyPage(() => import('@pages/host/HostManagePage')),
          },
        ],
      },
      {
        path: 'live/:partyId',
        element: <ProtectedRoute />,
        children: [{ index: true, element: lazyPage(() => import('@pages/live/LivePartyPage')) }],
      },
      {
        path: 'parties/:partyId/reveal',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/match-reveal/MatchRevealPage')) },
        ],
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
        children: [
          {
            index: true,
            element: lazyPage(() => import('@pages/notifications/NotificationsPage')),
          },
        ],
      },
      { path: 'search', element: lazyPage(() => import('@pages/search/SearchPage')) },
      { path: 'invite/:code', element: lazyPage(() => import('@pages/invite/InvitePage')) },
      { path: 'digest', element: lazyPage(() => import('@pages/digest/DigestPage')) },
      {
        path: 'become-host',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/host-apply/HostApplyPage')) },
        ],
      },
      {
        path: 'calendar',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/calendar/CalendarPage')) },
        ],
      },
      {
        path: 'admin',
        element: <ProtectedRoute requiredRole="admin" />,
        children: [
          { index: true, element: lazyPage(() => import('@pages/admin/AdminPage')) },
          {
            path: 'moderation',
            element: lazyPage(() => import('@pages/admin/AdminModerationPage')),
          },
        ],
      },
      { path: '*', element: lazyPage(() => import('@pages/notfound/NotFoundPage')) },
    ],
  },
]

export const router = createBrowserRouter(routes)
