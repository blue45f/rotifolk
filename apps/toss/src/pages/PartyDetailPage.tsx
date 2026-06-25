import { Button } from '@toss/tds-mobile'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

import { useGuestJoin, useGuestSeed, useGuestSession } from '@/domains/guest/hooks'
import { useAuthStore } from '@/domains/auth/store'
import { resolvePartyActorState, statusBadge } from '@/domains/party/flow'
import {
  buildPartyHeroActions,
  type ActionKey,
  type ActionPayload,
  type HeroAction,
} from '@/domains/party/actions'
import {
  cancelPartyJoin,
  endParty,
  getParty,
  hostAddGuest,
  joinParty,
  lockParty,
  startParty,
  type PartyDetail,
  type PartySession,
} from '@/lib/api'
import { useTransientMessage } from '@/shared/hooks/useTransientMessage'
import { shareMessage } from '@/lib/toss'
import { navigate } from '@/router'
import { theme } from '@/theme'
import { Badge, Cover, StatStrip } from '@/ui'

interface PartyDetailPageProps {
  id?: string
}

const PAGE_PADDING = 16
const TOAST_MS = 2200

export function PartyDetailPage({ id = '' }: PartyDetailPageProps) {
  const partyId = id
  const me = useAuthStore((state) => state.user)
  const [data, setData] = useState<PartySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showHostForm, setShowHostForm] = useState(false)
  const [nameForGuest, setNameForGuest] = useState('')
  const [nameForHost, setNameForHost] = useState('')
  const [busy, setBusy] = useState<Record<ActionKey, boolean>>({
    join: false,
    cancel: false,
    'guest-join': false,
    'host-lock': false,
    'host-start': false,
    'host-end': false,
    'host-add': false,
    refresh: false,
  })
  const { message, show } = useTransientMessage(TOAST_MS)
  const guestSession = useGuestSession(data?.party.id)
  const { mutate: runGuestJoin } = useGuestJoin()

  const load = useCallback(async () => {
    if (!partyId) {
      setError('모임 ID가 비정상입니다.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await getParty(partyId)
      setData(next ?? null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [partyId])

  useEffect(() => {
    void load()
  }, [load, partyId])

  const guestAvatar = useGuestSeed(nameForGuest, 0)
  const hostAvatar = useGuestSeed(nameForHost, 1)
  const actorState = useMemo(() => {
    if (!data) return null
    return resolvePartyActorState(data.party, data.participants, me, guestSession)
  }, [data, guestSession, me])

  const mutate = useCallback(
    async (key: ActionKey, action: () => Promise<unknown>, successMessage?: string) => {
      if (!partyId) return
      setBusy((prev) => ({ ...prev, [key]: true }))
      try {
        await action()
        if (successMessage) show(successMessage)
        await load()
      } catch (err) {
        show(toErrorMessage(err))
      } finally {
        setBusy((prev) => ({ ...prev, [key]: false }))
      }
    },
    [load, partyId, show]
  )

  const handleShare = useCallback(async () => {
    if (!data?.party) return
    const r = await shareMessage(`[로티포크] ${data.party.title}\n${data.party.description}`)
    if (r === 'clipboard') show('클립보드에 복사했어요.')
    if (r === 'toss') show('토스 공유로 연결했어요.')
    if (r === 'web-share') show('공유되었습니다.')
    if (r === null) show('공유가 취소되었어요.')
  }, [data?.party, show])

  const handleJoin = useCallback(async () => {
    await mutate(
      'join',
      () => joinParty(partyId),
      '신청이 접수됐어요. 마감 상태일 땐 대기표로 등록돼요.'
    )
  }, [mutate, partyId])

  const handleCancel = useCallback(async () => {
    await mutate('cancel', () => cancelPartyJoin(partyId), '참여 신청을 취소했어요.')
  }, [mutate, partyId])

  const handleHostLock = useCallback(async () => {
    await mutate('host-lock', () => lockParty(partyId), '모집을 잠갔어요.')
  }, [mutate, partyId])

  const handleHostStart = useCallback(async () => {
    await mutate('host-start', () => startParty(partyId), '파티가 시작됐어요.')
  }, [mutate, partyId])

  const handleHostEnd = useCallback(async () => {
    await mutate('host-end', () => endParty(partyId), '파티가 종료되었어요.')
  }, [mutate, partyId])

  const handleGuestJoin = useCallback(async () => {
    const nickname = nameForGuest.trim()
    if (!nickname) {
      show('닉네임을 먼저 입력해 주세요.')
      return
    }
    await mutate(
      'guest-join',
      async () => {
        await runGuestJoin(partyId, {
          nickname,
          avatar: {
            emoji: guestAvatar.emoji,
            hue: guestAvatar.hue,
          },
        })
        setShowGuestForm(false)
        setNameForGuest('')
      },
      '비회원 참가가 완료됐어요.'
    )
  }, [guestAvatar.emoji, guestAvatar.hue, mutate, nameForGuest, partyId, runGuestJoin, show])

  const handleHostAddGuest = useCallback(async () => {
    const name = nameForHost.trim()
    if (!name) {
      show('이름을 입력해 주세요.')
      return
    }
    await mutate(
      'host-add',
      async () => {
        await hostAddGuest(partyId, name)
        setShowHostForm(false)
        setNameForHost('')
      },
      '현장 참가자를 등록했어요.'
    )
  }, [mutate, nameForHost, partyId, show])

  const handleManualRefresh = useCallback(async () => {
    await mutate('refresh', load, '최신 상태로 갱신했어요.')
  }, [load, mutate])

  const actionPayload = useMemo<ActionPayload>(
    () => ({
      join: () => handleJoin(),
      leave: () => handleCancel(),
      openGuestJoin: () => setShowGuestForm(true),
      guestJoin: handleGuestJoin,
      hostLock: handleHostLock,
      hostStart: handleHostStart,
      hostEnd: handleHostEnd,
      busy,
    }),
    [
      handleCancel,
      handleGuestJoin,
      handleHostEnd,
      handleHostLock,
      handleHostStart,
      handleJoin,
      busy,
    ]
  )

  const heroActions = useMemo(() => {
    if (!actorState || !data) return [] as HeroAction[]

    return buildPartyHeroActions({
      actor: actorState,
      status: data.party.status,
      isMember: Boolean(me),
      callbacks: actionPayload,
    })
  }, [actorState, data?.party.status, actionPayload, me])

  if (loading) {
    return (
      <PageFrame>
        <DetailSkeleton />
      </PageFrame>
    )
  }

  if (error || !data) {
    return (
      <PageFrame>
        <div style={{ textAlign: 'center', color: theme.textMuted, paddingTop: 40 }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>{error ?? '모임을 찾을 수 없어요.'}</p>
          {error && (
            <Button onClick={() => void handleManualRefresh()} loading={busy.refresh}>
              다시 불러오기
            </Button>
          )}
          <div style={{ marginTop: 16 }}>
            <Button variant="weak" onClick={() => navigate('/')}>
              목록으로
            </Button>
          </div>
        </div>
      </PageFrame>
    )
  }

  const p: PartyDetail = data.party
  const statusSummary = {
    confirmed: data.participants.filter((part) => part.status === 'confirmed').length,
    checkedIn: data.participants.filter((part) => part.status === 'checked-in').length,
    waitlist: data.participants.filter((part) => part.status === 'waitlist').length,
  }
  const activeCount = statusSummary.confirmed + statusSummary.checkedIn
  const isAtCapacity = activeCount >= p.maxParticipants
  const joinedCount = data.participants.filter(
    (part) => part.status === 'confirmed' || part.status === 'checked-in'
  ).length
  const headerRole =
    actorState?.actor === 'host'
      ? '진행자 모드'
      : actorState?.actor === 'member'
        ? '참석자 모드'
        : actorState?.actor === 'guest'
          ? '비회원 참여 중'
          : '둘러보기'
  const badgeLabel = statusBadge(p.status)

  return (
    <PageFrame>
      <Header
        title={p.title}
        onBack={() => navigate('/')}
        right={<span style={{ fontSize: 13, color: theme.textMuted }}>{headerRole}</span>}
      />
      <div style={{ padding: '0 16px 0' }}>
        <div style={{ marginBottom: 14 }}>
          <Cover src={p.cover} alt={p.title} height={220} radius={16} seed={p.title} />
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Badge accent>{badgeLabel}</Badge>
            <Badge>{p.area}</Badge>
            {p.alcohol && <Badge>19+</Badge>}
          </div>
          <div style={{ color: theme.textMuted, marginTop: 8, fontSize: 13 }}>
            📍 {p.venueName}
            {p.venueArea ? ` · ${p.venueArea}` : ''}
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.32 }}>{p.title}</h1>

        {p.description ? (
          <p style={{ color: theme.text, fontSize: 15, lineHeight: 1.78, marginTop: 14 }}>
            {p.description}
          </p>
        ) : null}

        {p.tags?.length ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {p.tags.map((tag) => (
              <Badge key={tag}>{tag.startsWith('#') ? tag : `#${tag}`}</Badge>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <StatStrip
            stats={[
              {
                label: '참가비',
                value: p.basePriceKRW ? `₩${p.basePriceKRW.toLocaleString()}` : '0원',
              },
              { label: '정원', value: `${joinedCount}/${p.maxParticipants}명` },
              { label: '라운드', value: `${p.totalRounds ?? 0}회` },
            ]}
          />
        </div>

        <section style={{ marginTop: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>
            현재 참가: {activeCount}명 / {p.maxParticipants}명
            {statusSummary.waitlist > 0 ? ` · 대기 ${statusSummary.waitlist}명` : ''}
            {isAtCapacity ? ' · 마감' : ''}
            {p.totalRounds ? ` · ${p.roundMinutes}분 x ${p.totalRounds}라운드` : ''}
          </p>
        </section>

        {p.alcohol ? (
          <p
            style={{ fontSize: 12.5, color: theme.textMuted, lineHeight: 1.6, margin: '0 0 16px' }}
          >
            ※ 주류가 제공되는 모임으로 만 19세 이상만 참여할 수 있어요.
          </p>
        ) : null}
      </div>

      <ActionCard>
        {actorState?.actor === 'host' && actorState.canAddGuest && (
          <div style={{ marginBottom: 14 }}>
            <Button onClick={() => setShowHostForm(true)} style={{ width: '100%' }} variant="weak">
              현장 참가자 추가
            </Button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          {heroActions.map((action) => {
            const label = action.label
            const disabled = action.onClick == null || action.disabled
            return (
              <Button
                key={action.key}
                onClick={() => {
                  if (!action.onClick) return
                  void action.onClick()
                }}
                loading={action.busy}
                style={{ width: '100%', background: action.warning ? theme.danger : undefined }}
                variant={action.warning ? 'weak' : undefined}
                disabled={!!disabled}
              >
                {label}
              </Button>
            )
          })}
          <Button onClick={handleShare} variant="weak">
            공유하기
          </Button>
        </div>
      </ActionCard>

      {actorState?.actor === 'host' && data.participants.length ? (
        <ActionCard style={{ marginTop: 12 }}>
          <p style={{ margin: 0, color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>
            현재 참여자{' '}
            {p.maxParticipants ? `${activeCount}/${p.maxParticipants}명` : `${activeCount}명`}
            {statusSummary.waitlist > 0 ? ` (대기 ${statusSummary.waitlist}명)` : ''}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.participants.slice(0, 8).map((part) => {
              const label = part.guestName ?? part.user?.nickname ?? '참가자'
              return (
                <div
                  key={part.id}
                  style={{
                    height: 38,
                    borderRadius: 10,
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${theme.border}`,
                    fontSize: 13,
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: theme.textMuted }}>{part.status}</span>
                </div>
              )
            })}
            {data.participants.length > 8 ? (
              <p style={{ margin: 0, color: theme.textMuted, fontSize: 12 }}>
                +{data.participants.length - 8}명 더 보기
              </p>
            ) : null}
          </div>
        </ActionCard>
      ) : null}

      {showHostForm ? (
        <BottomSheet>
          <SheetHeader>현장 참가자 등록</SheetHeader>
          <p style={{ margin: '0 0 10px', color: theme.textMuted, fontSize: 13 }}>
            진행자 권한으로 이름을 입력해 즉시 등록할 수 있어요.
          </p>
          <AvatarRow>
            <span style={{ fontSize: 28 }}>{hostAvatar.emoji}</span>
            <div>
              <strong>{nameForHost || '참가자 이름'}</strong>
              <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 12 }}>
                진행자 임시 아바타
              </p>
            </div>
          </AvatarRow>
          <Input
            value={nameForHost}
            onChange={(e) => setNameForHost(e.target.value)}
            placeholder="참가자 이름(1~16자)"
            maxLength={16}
            style={{ marginBottom: 12 }}
          />
          <SheetActions>
            <Button variant="weak" onClick={() => setShowHostForm(false)} style={{ flex: 1 }}>
              닫기
            </Button>
            <Button
              onClick={() => void handleHostAddGuest()}
              loading={busy['host-add']}
              style={{ flex: 1 }}
            >
              등록
            </Button>
          </SheetActions>
        </BottomSheet>
      ) : null}

      {showGuestForm ? (
        <BottomSheet>
          <SheetHeader>비회원으로 참가</SheetHeader>
          <p style={{ margin: '0 0 10px', color: theme.textMuted, fontSize: 13 }}>
            휴대폰 인증 없이 닉네임만으로 들어갈 수 있어요. 다시 방문하면 같은 토큰으로 내역이
            유지돼요.
          </p>
          <AvatarRow>
            <span style={{ fontSize: 28 }}>{guestAvatar.emoji}</span>
            <div>
              <strong>{nameForGuest || '게스트'}</strong>
              <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 12 }}>
                자동 생성 토큰으로 재방문 동기화
              </p>
            </div>
          </AvatarRow>
          <Input
            value={nameForGuest}
            onChange={(e) => setNameForGuest(e.target.value)}
            placeholder="참여할 닉네임"
            maxLength={16}
            style={{ marginBottom: 12 }}
            autoFocus
          />
          <SheetActions>
            <Button variant="weak" onClick={() => setShowGuestForm(false)} style={{ flex: 1 }}>
              닫기
            </Button>
            <Button
              onClick={() => void handleGuestJoin()}
              loading={busy['guest-join']}
              style={{ flex: 1 }}
            >
              참가하기
            </Button>
          </SheetActions>
        </BottomSheet>
      ) : null}

      {message ? <Toast role="status">{message}</Toast> : null}
    </PageFrame>
  )
}

function Header({
  title,
  right,
  onBack,
}: {
  title: string
  right?: ReactNode
  onBack: () => void
}) {
  return (
    <div
      style={{
        height: 58,
        padding: '0 8px',
        paddingTop: 'env(safe-area-inset-top)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: `color-mix(in oklab, ${theme.bg} 82%, transparent)`,
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}
    >
      <button
        type="button"
        aria-label="뒤로"
        onClick={onBack}
        className="pressable"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          border: 'none',
          background: 'transparent',
          color: theme.text,
          fontSize: 26,
          cursor: 'pointer',
        }}
      >
        ←
      </button>
      <div
        style={{
          fontSize: 13,
          color: theme.textMuted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '52%',
        }}
      >
        {title}
      </div>
      <div style={{ width: 64, textAlign: 'right', fontSize: 12 }}>{right}</div>
    </div>
  )
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

function ActionCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        margin: '10px 16px 0',
        padding: 16,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        background: theme.surface,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function BottomSheet({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        padding: `16px calc(${PAGE_PADDING}px + env(safe-area-inset-right)) 16px calc(${PAGE_PADDING}px + env(safe-area-inset-left))`,
        paddingBottom: `calc(16px + env(safe-area-inset-bottom))`,
        background: theme.surface,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderTop: `1px solid ${theme.border}`,
        zIndex: 30,
      }}
    >
      {children}
    </div>
  )
}

function SheetHeader({ children }: { children: ReactNode }) {
  return <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>{children}</h2>
}

function SheetActions({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 8 }}>{children}</div>
}

function AvatarRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      {children}
    </div>
  )
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="field"
      style={{
        height: 44,
        borderRadius: 12,
        background: theme.surfaceAlt,
        border: `1px solid ${theme.border}`,
        color: theme.text,
        fontSize: 15,
        ...props.style,
      }}
    />
  )
}

function Toast(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role={props.role ?? 'status'}
      {...props}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.86)',
        color: theme.text,
        padding: '10px 18px',
        fontSize: 13.5,
        maxWidth: '90%',
        textAlign: 'center',
        zIndex: 40,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div
      style={{ background: theme.bg, minHeight: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div style={{ padding: '0 16px' }}>
        <div
          className="pulse"
          style={{ height: 52, borderRadius: 12, marginTop: 6, background: theme.surface }}
        />
        <div
          className="pulse"
          style={{ height: 220, borderRadius: 16, marginTop: 14, background: theme.surface }}
        />
        <div
          className="pulse"
          style={{
            height: 26,
            borderRadius: 8,
            marginTop: 16,
            width: '70%',
            background: theme.surface,
          }}
        />
        <div
          className="pulse"
          style={{ height: 80, borderRadius: 8, marginTop: 16, background: theme.surface }}
        />
      </div>
      <ActionCard style={{ marginTop: 16 }}>
        <div
          className="pulse"
          style={{ height: 52, borderRadius: 12, background: theme.surfaceAlt }}
        />
      </ActionCard>
    </div>
  )
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return '일시적인 오류가 발생했어요.'
}
