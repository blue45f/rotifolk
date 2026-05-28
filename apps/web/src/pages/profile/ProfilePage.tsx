import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { AvatarMood, PartySummary, User } from '@rotifolk/shared'
import { computeHostLevel } from '@rotifolk/shared'
import { useMyParties } from '@features/parties/queries'
import { useLogout, useMe } from '@features/auth/queries'
import { useAuthStore } from '@store/authStore'
import { useThemeStore } from '@store/themeStore'
import { Card } from '@components/ui/Card/Card'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { HostLevelBadge } from '@components/ui/HostLevelBadge/HostLevelBadge'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import { PartyCard } from '@features/parties/PartyCard'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { computeAchievements, summarizeAchievements } from '@features/achievements/achievements'
import { api } from '@services/api'
import styles from './Profile.module.css'

const MOODS: { value: AvatarMood; label: string; emoji: string }[] = [
  { value: 'chill', label: '여유로운', emoji: '🌙' },
  { value: 'sparkling', label: '반짝이는', emoji: '✨' },
  { value: 'curious', label: '호기심 많은', emoji: '🔭' },
  { value: 'witty', label: '재치 있는', emoji: '🎷' },
  { value: 'cozy', label: '따뜻한', emoji: '☕️' },
  { value: 'mystery', label: '신비로운', emoji: '🌹' },
]
const HUES = ['#7A1F3D', '#C9627F', '#D4A24C', '#6B8E5A', '#2F7884', '#6E5BB3', '#6B4226']
const EMOJIS = ['🍷', '☕️', '🍵', '🥃', '✨', '🌹', '🍯', '🎷', '🎻', '🌙']

export default function ProfilePage() {
  useMe()
  const user = useAuthStore((s) => s.user)
  const updateLocal = useAuthStore((s) => s.updateUser)
  const logout = useLogout()
  const { data: mine, isLoading } = useMyParties()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [tab, setTab] = useState('upcoming')
  const [showAvatar, setShowAvatar] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [bioDraft, setBioDraft] = useState('')
  const [mbtiDraft, setMbtiDraft] = useState('')
  const [interestsDraft, setInterestsDraft] = useState('')
  const toast = useToast()

  const [draftMood, setDraftMood] = useState<AvatarMood>('sparkling')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('users/me'),
    onSuccess: () => {
      toast.show('계정이 삭제됐어요. 다음에 또 만나요.', 'success')
      logout()
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })
  const [draftHue, setDraftHue] = useState(HUES[0])
  const [draftEmoji, setDraftEmoji] = useState(EMOJIS[0])

  const { data: savedItems } = useQuery({
    queryKey: ['saved'],
    queryFn: () => api.get<PartySummary[]>('saved'),
    enabled: !!user,
  })

  const { data: referral } = useQuery({
    queryKey: ['users', 'me', 'referral'],
    queryFn: () =>
      api.get<{ referralCode: string; pointsKRW: number; referredCount: number }>(
        'users/me/referral',
      ),
    enabled: !!user,
  })

  const copyReferralCode = async () => {
    if (!referral?.referralCode) return
    try {
      await navigator.clipboard.writeText(referral.referralCode)
      toast.show('초대 코드를 복사했어요', 'success')
    } catch {
      toast.show('복사에 실패했어요. 코드를 길게 눌러 복사해 주세요.', 'error')
    }
  }

  if (!user) return null
  if (isLoading) return <Loading />

  const hostLevel = computeHostLevel({
    hostedCount: user.hostedCount,
    averageRating: 0,
  })

  const achievements = computeAchievements({
    hostedCount: user.hostedCount,
    joinedCount: user.joinedCount,
    trustScore: user.trustScore,
    isVerified: user.isVerified,
    hasReferred: referral?.referredCount ?? 0,
  })
  const { earned: earnedAchievements, total: totalAchievements } = summarizeAchievements(achievements)

  const upcoming = mine?.filter((m) =>
    ['confirmed', 'waitlist', 'checked-in'].includes(m.participation.status),
  )
  const past = mine?.filter((m) => ['cancelled', 'no-show'].includes(m.participation.status))

  const saveAvatar = async () => {
    try {
      await api.patch('avatars/me', {
        mood: draftMood,
        hue: draftHue,
        emojiBadge: draftEmoji,
        pattern: 'gradient',
      })
      toast.show('아바타가 업데이트됐어요 ✨', 'success')
      setShowAvatar(false)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const saveProfile = async () => {
    const interests = interestsDraft
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 8)
    const mbti = mbtiDraft.trim().toUpperCase()

    try {
      const updated = await api.patch<User>('users/me', {
        bio: bioDraft.trim(),
        interests,
        ...(mbti ? { mbti } : {}),
      })
      updateLocal(updated)
      setShowProfileEdit(false)
      toast.show('프로필이 업데이트됐어요', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <Avatar size="xl" hue={draftHue} pattern="gradient" emoji={user.nickname[0]} ring="glow" />
        <div className={styles.headBody}>
          <h1 className={styles.name}>
            {user.nickname}
            {user.isVerified && <Badge tone="info">✓ 인증</Badge>}
            <HostLevelBadge level={hostLevel.level} size="md" />
          </h1>
          <p className={styles.bio}>{user.bio ?? '한 줄 소개를 추가해 보세요.'}</p>
          <div className={styles.statRow}>
            <span>
              <strong>{user.hostedCount}</strong> 호스팅
            </span>
            <span>
              <strong>{user.joinedCount}</strong> 참여
            </span>
            <span>
              <strong>{Math.round(user.hostedCount * 6 + user.joinedCount * 8)}</strong> 만난 사람
            </span>
            <span>
              <strong>{user.trustScore.toFixed(0)}</strong> 신뢰도
            </span>
          </div>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBioDraft(user.bio ?? '')
                setMbtiDraft(user.mbti ?? '')
                setInterestsDraft((user.interests ?? []).join(', '))
                setShowProfileEdit(true)
              }}
            >
              ✏️ 프로필 편집
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAvatar(true)}>
              아바타 편집
            </Button>
            {user.role === 'participant' && (
              <Button
                variant="soft"
                size="sm"
                onClick={async () => {
                  await api.post('users/me/become-host')
                  updateLocal({ role: 'host' })
                  toast.show('호스트로 전환됐어요!', 'success')
                }}
              >
                호스트로 시작
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className={`container ${styles.tabsRow}`}>
        <Tabs
          tabs={[
            { value: 'upcoming', label: `다가오는 (${upcoming?.length ?? 0})` },
            { value: 'saved', label: `저장 (${savedItems?.length ?? 0})` },
            { value: 'past', label: `지난 (${past?.length ?? 0})` },
            { value: 'badges', label: `업적 (${earnedAchievements}/${totalAchievements})` },
            { value: 'reviews', label: '받은 후기' },
            { value: 'settings', label: '설정' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <section className={`container ${styles.section}`}>
        {tab === 'upcoming' && (
          upcoming && upcoming.length > 0 ? (
            <div className={styles.grid}>
              {upcoming.map((m) => (
                <PartyCard key={m.party.id} party={m.party} />
              ))}
            </div>
          ) : (
            <EmptyState
              emoji="🍷"
              title="아직 참여한 파티가 없어요"
              description="첫 라운드를 시작해 볼까요?"
              action={
                <Link to="/discover">
                  <Button variant="primary">파티 탐색</Button>
                </Link>
              }
            />
          )
        )}

        {tab === 'saved' && (
          savedItems && savedItems.length > 0 ? (
            <>
              <div className={styles.grid}>
                {savedItems.slice(0, 9).map((p) => (
                  <PartyCard key={p.id} party={p} />
                ))}
              </div>
              {savedItems.length > 9 && (
                <div className={styles.savedFoot}>
                  <Link to="/me/saved">
                    <Button variant="outline">전체 {savedItems.length}개 보기 →</Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              emoji="★"
              title="저장한 모임이 없어요"
              description="파티 상세에서 ☆를 누르면 여기 모여요."
            />
          )
        )}

        {tab === 'past' && (
          past && past.length > 0 ? (
            <div className={styles.grid}>
              {past.map((m) => (
                <PartyCard key={m.party.id} party={m.party} />
              ))}
            </div>
          ) : (
            <EmptyState emoji="🌙" title="아직 지난 파티가 없어요" />
          )
        )}

        {tab === 'badges' && (
          <div className={styles.achievementGrid}>
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`${styles.achievement} ${a.earned ? styles.achievementEarned : ''}`}
                title={a.description}
              >
                <span className={styles.achievementEmoji} aria-hidden="true">{a.emoji}</span>
                <div className={styles.achievementBody}>
                  <strong>{a.label}</strong>
                  <small>{a.description}</small>
                </div>
                {a.earned && <span className={styles.achievementMark} aria-label="획득">✓</span>}
              </div>
            ))}
          </div>
        )}

        {tab === 'reviews' && <ReceivedReviews userId={user.id} />}

        {tab === 'settings' && (
          <>
            <Card padding="lg">
              <h3 className={styles.h3}>친구 초대 코드</h3>
              <p className={styles.referralLead}>
                친구가 이 코드로 가입하면 <strong>둘 다 3,000원</strong>이 적립돼요. 다음 모임 결제에 사용할 수 있어요.
              </p>
              <div className={styles.referralCode}>
                <code className={styles.referralCodeText}>
                  {referral?.referralCode ?? '불러오는 중…'}
                </code>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={copyReferralCode}
                  disabled={!referral?.referralCode}
                >
                  복사
                </Button>
              </div>
              <div className={styles.referralStats}>
                <div className={styles.referralStat}>
                  <span className={styles.referralStatLabel}>누적 포인트</span>
                  <strong className={styles.referralStatValue}>
                    {(referral?.pointsKRW ?? 0).toLocaleString('ko-KR')}원 적립됨
                  </strong>
                </div>
                <div className={styles.referralStat}>
                  <span className={styles.referralStatLabel}>초대한 친구</span>
                  <strong className={styles.referralStatValue}>
                    {referral?.referredCount ?? 0}명
                  </strong>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <h3 className={styles.h3}>화면</h3>
              <div className={styles.themeRow}>
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <Chip key={t} selected={theme === t} onClick={() => setTheme(t)}>
                    {t === 'light' ? '🌞 라이트' : t === 'dark' ? '🌙 다크' : '🌗 시스템'}
                  </Chip>
                ))}
              </div>
              <div className={styles.divider} />
              <div className={styles.settingsLinks}>
                <Link to="/me/saved" className={styles.settingsLink}>
                  <span>☆ 저장한 모임</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/me/payments" className={styles.settingsLink}>
                  <span>🧾 결제 내역</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/me/follows" className={styles.settingsLink}>
                  <span>👥 팔로잉</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link to="/me/blocks" className={styles.settingsLink}>
                  <span>🚫 차단한 사용자</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className={styles.divider} />
              <Button variant="ghost" onClick={() => logout()}>
                로그아웃
              </Button>
            </Card>

            <Card padding="lg">
              <h3 className={styles.h3}>계정 관리</h3>
              <p className={styles.settingsDanger}>
                계정을 삭제하면 모든 데이터(참가 내역, 명함, 저장 목록)가 영구적으로 삭제돼요.
              </p>
              {!showDeleteConfirm ? (
                <Button variant="soft" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  계정 삭제
                </Button>
              ) : (
                <div className={styles.deleteConfirm}>
                  <p className={styles.deleteConfirmText}>정말 삭제할까요? 이 작업은 되돌릴 수 없어요.</p>
                  <div className={styles.deleteConfirmActions}>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                      취소
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => deleteAccount.mutate()}
                      isLoading={deleteAccount.isPending}
                    >
                      네, 삭제할게요
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </section>

      <Sheet
        open={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        title="프로필 편집"
        description="소개와 관심사를 최신 상태로 유지해요"
        variant="modal"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowProfileEdit(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={saveProfile}>
              저장
            </Button>
          </>
        }
      >
        <label className={styles.editField}>
          <span className={styles.editLabel}>한 줄 소개</span>
          <textarea
            className={styles.textarea}
            value={bioDraft}
            maxLength={200}
            rows={4}
            onChange={(e) => setBioDraft(e.target.value)}
          />
        </label>
        <Input
          label="MBTI"
          value={mbtiDraft}
          maxLength={4}
          placeholder="ENFP"
          onChange={(e) => setMbtiDraft(e.target.value.toUpperCase())}
        />
        <Input
          label="관심사"
          value={interestsDraft}
          placeholder="와인, 커피, 전시"
          hint="쉼표로 구분해 최대 8개까지 저장돼요."
          onChange={(e) => setInterestsDraft(e.target.value)}
        />
      </Sheet>

      <Sheet
        open={showAvatar}
        onClose={() => setShowAvatar(false)}
        title="아바타 빌더"
        description="실명 대신 어울리는 무드와 색을 골라요"
        variant="modal"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAvatar(false)}>
              취소
            </Button>
            <Button variant="primary" onClick={saveAvatar}>
              저장
            </Button>
          </>
        }
      >
        <div className={styles.avatarPreview}>
          <Avatar size="xl" hue={draftHue} pattern="gradient" emoji={draftEmoji} ring="glow" />
        </div>

        <h4 className={styles.lbl}>무드</h4>
        <div className={styles.chipRow}>
          {MOODS.map((m) => (
            <Chip
              key={m.value}
              leadingEmoji={m.emoji}
              selected={draftMood === m.value}
              onClick={() => setDraftMood(m.value)}
            >
              {m.label}
            </Chip>
          ))}
        </div>

        <h4 className={styles.lbl}>컬러</h4>
        <div className={styles.swatchRow}>
          {HUES.map((h) => (
            <button
              key={h}
              type="button"
              className={`${styles.swatch} ${draftHue === h ? styles.swatchActive : ''}`}
              style={{ background: h }}
              aria-label={`색상 ${h}`}
              onClick={() => setDraftHue(h)}
            />
          ))}
        </div>

        <h4 className={styles.lbl}>이모지</h4>
        <div className={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`${styles.emojiBtn} ${draftEmoji === e ? styles.emojiActive : ''}`}
              onClick={() => setDraftEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

interface HostReview {
  id: string
  rating: number
  body: string
  anonymous: boolean
  tags: string[]
  hostReply: string | null
  hostRepliedAt: string | null
  createdAt: string
}

function ReceivedReviews({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: () =>
      api.get<{ averageRating: number; count: number; reviews: HostReview[] }>(
        `users/${userId}/reviews`,
      ),
  })
  if (isLoading) return <Loading />
  if (!data || data.count === 0)
    return (
      <EmptyState
        emoji="⭐"
        title="아직 받은 후기가 없어요"
        description="모임을 호스팅하거나 참가하면 후기가 여기 모여요."
      />
    )
  return (
    <Card padding="lg">
      <div className={styles.reviewSummary}>
        <strong className={styles.reviewAvg}>{data.averageRating.toFixed(1)}</strong>
        <span className={styles.reviewStars} aria-label={`${data.averageRating}점`}>
          {'★'.repeat(Math.round(data.averageRating))}
          {'☆'.repeat(5 - Math.round(data.averageRating))}
        </span>
        <span>총 {data.count}개 후기</span>
      </div>
      <ul className={styles.reviewList}>
        {data.reviews.map((r) => (
          <li key={r.id}>
            <div className={styles.reviewHead}>
              <span className={styles.reviewStars}>
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </span>
              <time>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</time>
            </div>
            <p>{r.body}</p>
            {r.hostReply && (
              <div className={styles.reviewReply}>
                <strong>🎙️ 내 답글</strong>
                <p>{r.hostReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
