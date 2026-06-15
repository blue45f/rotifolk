import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import { HostLevelBadge } from '@components/ui/HostLevelBadge/HostLevelBadge'
import { Input } from '@components/ui/Input/Input'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { usePageMeta } from '@hooks/usePageMeta'
import { computeHostLevel } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useThemeStore } from '@store/themeStore'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'

import styles from './Profile.module.css'

import type { AvatarMood, PartySummary, User } from '@rotifolk/shared'

import { computeAchievements, summarizeAchievements } from '@/domains/achievements/achievements'
import { useLogout, useMe } from '@/domains/auth/queries'
import { resizeAvatarImage } from '@/domains/avatar/imageUpload'
import { PartyCard } from '@/domains/parties/PartyCard'
import { useMyParties } from '@/domains/parties/queries'
import { api } from '@/infrastructure/api'

const MOODS: { value: AvatarMood; label: string; emoji: string }[] = [
  { value: 'chill', label: '여유로운', emoji: '🌙' },
  { value: 'sparkling', label: '반짝이는', emoji: '✨' },
  { value: 'curious', label: '호기심 많은', emoji: '🔭' },
  { value: 'witty', label: '재치 있는', emoji: '🎷' },
  { value: 'cozy', label: '따뜻한', emoji: '☕️' },
  { value: 'mystery', label: '신비로운', emoji: '🌹' },
]
const HUES = [
  'var(--color-primary)',
  'var(--brand-apricot-400)',
  'var(--brand-amber-500)',
  'var(--cat-tea)',
  'var(--cat-cocktail)',
  'var(--cat-custom)',
  'var(--cat-coffee)',
]
const EMOJIS = ['🍷', '☕️', '🍵', '🥃', '✨', '🌹', '🍯', '🎷', '🎻', '🌙']

const SETTINGS_LINKS: { to: string; icon: IconName; label: string }[] = [
  { to: '/me/profile-studio', icon: 'shield', label: '사전 프로필 · 신상 인증 · 지인 회피' },
  { to: '/me/notes', icon: 'mail', label: '쪽지함' },
  { to: '/me/saved', icon: 'bookmark', label: '저장한 모임' },
  { to: '/me/payments', icon: 'archive', label: '결제 내역' },
  { to: '/me/follows', icon: 'user', label: '팔로잉' },
  { to: '/me/blocks', icon: 'shield', label: '차단한 사용자' },
]

export default function ProfilePage() {
  useMe()
  const user = useAuthStore((s) => s.user)
  usePageMeta({
    title: user ? `${user.nickname}님의 프로필` : '내 프로필',
    description: '내 로테이션 파티 활동·호스팅·매치 카드를 한곳에서 관리하세요.',
  })
  const updateLocal = useAuthStore((s) => s.updateUser)
  const [verifyNudgeOff, setVerifyNudgeOff] = useState(
    () => localStorage.getItem('rotifolk-verify-nudge') === 'off'
  )
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
  // 직접 업로드한 프로필 사진(data URL) 초안 — null이면 프리셋 폴백(=삭제).
  const [draftImage, setDraftImage] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: savedItems } = useQuery({
    queryKey: ['saved'],
    queryFn: () => api.get<PartySummary[]>('saved'),
    enabled: !!user,
  })

  const { data: referral } = useQuery({
    queryKey: ['users', 'me', 'referral'],
    queryFn: () =>
      api.get<{ referralCode: string; pointsKRW: number; referredCount: number }>(
        'users/me/referral'
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
  const { earned: earnedAchievements, total: totalAchievements } =
    summarizeAchievements(achievements)

  // 프로필 완성도 — 채울수록 매칭 품질·신뢰도가 올라간다. 미완 항목이 있을 때만 안내.
  const completeness = computeProfileCompleteness(user)
  // 항목별로 알맞은 액션으로 보낸다(편집 시트 vs 프로필 스튜디오).
  const NEXT_ITEM_CTA: Record<string, { label: string } & ({ to: string } | { edit: true })> = {
    bio: { label: '소개 작성', edit: true },
    mbti: { label: 'MBTI 입력', edit: true },
    interests: { label: '관심사 추가', edit: true },
    avatar: { label: '사진 올리기', to: '#avatar' },
    basics: { label: '기본 정보 입력', to: '/me/profile-studio' },
    preProfile: { label: '사전 프로필 작성', to: '/me/profile-studio' },
    channel: { label: '연결 채널 추가', to: '/me/profile-studio' },
    verified: { label: '본인 인증', to: '/me/profile-studio' },
  }

  const upcoming = mine?.filter((m) =>
    ['confirmed', 'waitlist', 'checked-in'].includes(m.participation.status)
  )
  const past = mine?.filter((m) => ['cancelled', 'no-show'].includes(m.participation.status))

  const stats: { label: string; value: string | number }[] = [
    { label: '호스팅', value: user.hostedCount },
    { label: '참여', value: user.joinedCount },
    { label: '만난 사람', value: Math.round(user.hostedCount * 6 + user.joinedCount * 8) },
    { label: '신뢰도', value: user.trustScore.toFixed(0) },
  ]

  const saveAvatar = async () => {
    try {
      await api.patch('avatars/me', {
        mood: draftMood,
        hue: draftHue,
        emojiBadge: draftEmoji,
        pattern: 'gradient',
        // 업로드한 사진을 함께 저장 — null이면 서버에서 사진을 지우고 프리셋으로 폴백.
        imageData: draftImage,
      })
      updateLocal({ avatarImage: draftImage })
      toast.show('아바타가 업데이트됐어요 ✨', 'success')
      setShowAvatar(false)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const openAvatarEditor = () => {
    setDraftImage(user?.avatarImage ?? null)
    setShowAvatar(true)
  }

  const openProfileEditor = () => {
    setBioDraft(user.bio ?? '')
    setMbtiDraft(user.mbti ?? '')
    setInterestsDraft((user.interests ?? []).join(', '))
    setShowProfileEdit(true)
  }

  const onPickAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 onChange가 다시 뜨도록 초기화
    if (!file) return
    setImageBusy(true)
    try {
      setDraftImage(await resizeAvatarImage(file))
    } catch (err) {
      toast.show((err as Error).message, 'error')
    } finally {
      setImageBusy(false)
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

  const showVerifyNudge = !user.verifiedFields?.includes('identity') && !verifyNudgeOff

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <Avatar
          size="xl"
          hue={draftHue}
          pattern="gradient"
          emoji={user.nickname[0]}
          imageSrc={user.avatarImage ?? null}
          ring="glow"
          label={`${user.nickname}님의 프로필 사진`}
        />
        <div className={styles.headBody}>
          <h1 className={styles.name}>
            {user.nickname}
            {user.isVerified && (
              <Badge tone="info">
                <Icon name="check" size={0.85} /> 인증
              </Badge>
            )}
            <HostLevelBadge level={hostLevel.level} size="md" />
          </h1>
          <p className={styles.bio}>{user.bio ?? '한 줄 소개를 추가해 보세요.'}</p>
          <dl className={styles.statRow}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icon name="user" />}
              onClick={openProfileEditor}
            >
              프로필 편집
            </Button>
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Icon name="sparkle" />}
              onClick={openAvatarEditor}
            >
              아바타 편집
            </Button>
            {user.role === 'participant' && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="shield" />}
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

      {completeness.percent < 100 && completeness.nextItem && (
        <div className="container">
          <section className={styles.completeness} aria-labelledby="profile-completeness">
            <div className={styles.completenessHead}>
              <strong id="profile-completeness">프로필 완성도</strong>
              <span className={styles.completenessPercent}>{completeness.percent}%</span>
            </div>
            <div
              className={styles.completenessBar}
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="프로필 완성도"
            >
              <div
                className={styles.completenessFill}
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <div className={styles.completenessChecks}>
              {completeness.items.map((item) => (
                <span
                  key={item.key}
                  className={`${styles.completenessChip} ${item.done ? styles.completenessChipDone : ''}`}
                >
                  <Icon name={item.done ? 'check' : 'plus'} size={0.7} />
                  {item.label}
                </span>
              ))}
            </div>
            <div className={styles.completenessFoot}>
              <span className={styles.completenessNext}>
                다음: <strong>{completeness.nextItem.label}</strong>
              </span>
              {(() => {
                const cta = NEXT_ITEM_CTA[completeness.nextItem.key]
                if (!cta) return null
                if ('edit' in cta) {
                  return (
                    <Button variant="soft" size="sm" onClick={openProfileEditor}>
                      {cta.label}
                    </Button>
                  )
                }
                if (cta.to === '#avatar') {
                  return (
                    <Button variant="soft" size="sm" onClick={openAvatarEditor}>
                      {cta.label}
                    </Button>
                  )
                }
                return (
                  <Link to={cta.to}>
                    <Button variant="soft" size="sm">
                      {cta.label}
                    </Button>
                  </Link>
                )
              })()}
            </div>
          </section>
        </div>
      )}

      {showVerifyNudge && (
        <div className="container">
          <div className={styles.nudge} role="note">
            <span className={styles.nudgeIcon} aria-hidden="true">
              <Icon name="shield" />
            </span>
            <div className={styles.nudgeBody}>
              <strong>본인인증으로 신뢰를 더해보세요</strong>
              <span>
                선택이에요. 인증하면 매칭 상대·참가자에게 인증 배지로 신뢰를 줄 수 있어요.
              </span>
            </div>
            <Link to="/me/profile-studio" className={styles.nudgeCta}>
              <Button variant="gold" size="sm">
                인증하기
              </Button>
            </Link>
            <button
              type="button"
              className={styles.nudgeClose}
              aria-label="안내 닫기"
              onClick={() => {
                localStorage.setItem('rotifolk-verify-nudge', 'off')
                setVerifyNudgeOff(true)
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}

      <div className={`container ${styles.tabsRow}`}>
        <Tabs
          label="프로필 섹션"
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

      <section className={`container ${styles.section}`} aria-label="프로필 내용">
        {tab === 'upcoming' &&
          (upcoming && upcoming.length > 0 ? (
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
          ))}

        {tab === 'saved' &&
          (savedItems && savedItems.length > 0 ? (
            <>
              <div className={styles.grid}>
                {savedItems.slice(0, 9).map((p) => (
                  <PartyCard key={p.id} party={p} />
                ))}
              </div>
              {savedItems.length > 9 && (
                <div className={styles.savedFoot}>
                  <Link to="/me/saved">
                    <Button variant="outline" rightIcon={<Icon name="chevron-right" />}>
                      전체 {savedItems.length}개 보기
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              emoji="🔖"
              title="저장한 모임이 없어요"
              description="파티 상세에서 저장 버튼을 누르면 여기 모여요."
            />
          ))}

        {tab === 'past' &&
          (past && past.length > 0 ? (
            <div className={styles.grid}>
              {past.map((m) => (
                <PartyCard key={m.party.id} party={m.party} />
              ))}
            </div>
          ) : (
            <EmptyState emoji="🌙" title="아직 지난 파티가 없어요" />
          ))}

        {tab === 'badges' && (
          <div className={styles.achievementGrid}>
            {achievements.map((a) => (
              <div
                key={a.id}
                className={`${styles.achievement} ${a.earned ? styles.achievementEarned : ''}`}
                title={a.description}
              >
                <span className={styles.achievementEmoji} aria-hidden="true">
                  {a.emoji}
                </span>
                <div className={styles.achievementBody}>
                  <strong>{a.label}</strong>
                  <small>{a.description}</small>
                </div>
                {a.earned && (
                  <span className={styles.achievementMark} aria-label="획득">
                    <Icon name="check" size={0.8} />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'reviews' && <ReceivedReviews userId={user.id} />}

        {tab === 'settings' && (
          <div className={styles.settings}>
            <section className={styles.settingsGroup} aria-labelledby="set-referral">
              <h2 id="set-referral" className={styles.groupTitle}>
                친구 초대 코드
              </h2>
              <p className={styles.referralLead}>
                친구가 이 코드로 가입하면 <strong>둘 다 3,000원</strong>이 적립돼요. 다음 모임
                결제에 사용할 수 있어요.
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
            </section>

            <section className={styles.settingsGroup} aria-labelledby="set-display">
              <h2 id="set-display" className={styles.groupTitle}>
                화면
              </h2>
              <div className={styles.themeRow} role="group" aria-label="테마 선택">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <Chip
                    key={t}
                    selected={theme === t}
                    leadingIcon={
                      <Icon name={t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'monitor'} />
                    }
                    onClick={() => setTheme(t)}
                  >
                    {t === 'light' ? '라이트' : t === 'dark' ? '다크' : '시스템'}
                  </Chip>
                ))}
              </div>
            </section>

            <section className={styles.settingsGroup} aria-labelledby="set-links">
              <h2 id="set-links" className={styles.groupTitle}>
                바로가기
              </h2>
              <nav className={styles.settingsLinks} aria-label="프로필 바로가기">
                {SETTINGS_LINKS.map((l) => (
                  <Link key={l.to} to={l.to} className={styles.settingsLink}>
                    <span className={styles.settingsLinkIcon} aria-hidden="true">
                      <Icon name={l.icon} />
                    </span>
                    <span className={styles.settingsLinkLabel}>{l.label}</span>
                    <Icon name="chevron-right" aria-hidden="true" />
                  </Link>
                ))}
              </nav>
              <div className={styles.divider} />
              <Button variant="ghost" onClick={() => logout()}>
                로그아웃
              </Button>
            </section>

            <section className={styles.settingsGroup} aria-labelledby="set-account">
              <h2 id="set-account" className={styles.groupTitle}>
                계정 관리
              </h2>
              <p className={styles.settingsDanger}>
                계정을 삭제하면 모든 데이터(참가 내역, 명함, 저장 목록)가 영구적으로 삭제돼요.
              </p>
              {!showDeleteConfirm ? (
                <Button variant="soft" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  계정 삭제
                </Button>
              ) : (
                <div className={styles.deleteConfirm}>
                  <p className={styles.deleteConfirmText}>
                    정말 삭제할까요? 이 작업은 되돌릴 수 없어요.
                  </p>
                  <div className={styles.deleteConfirmActions}>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                      취소
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteAccount.mutate()}
                      isLoading={deleteAccount.isPending}
                    >
                      네, 삭제할게요
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
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
          <Avatar
            size="xl"
            hue={draftHue}
            pattern="gradient"
            emoji={draftEmoji}
            imageSrc={draftImage}
            ring="glow"
            label="아바타 미리보기"
          />
        </div>

        <h4 className={styles.lbl}>프로필 사진</h4>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.avatarFileInput}
          aria-label="프로필 사진 파일 선택"
          onChange={onPickAvatarFile}
        />
        <div className={styles.avatarPhotoRow}>
          <Button
            variant="soft"
            size="sm"
            isLoading={imageBusy}
            leftIcon={<Icon name="sparkle" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {draftImage ? '사진 변경' : '사진 올리기'}
          </Button>
          {draftImage && (
            <Button variant="ghost" size="sm" onClick={() => setDraftImage(null)}>
              사진 삭제
            </Button>
          )}
        </div>
        <p className={styles.avatarPhotoHint}>
          최대 5MB · 자동으로 256px로 줄여 저장돼요. 사진을 지우면 아래 무드 아바타로 돌아가요.
        </p>

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
              aria-pressed={draftHue === h}
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
              aria-label={`이모지 ${e}`}
              aria-pressed={draftEmoji === e}
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
        `users/${userId}/reviews`
      ),
  })
  if (isLoading) return <Loading />
  if (!data || data.count === 0)
    return (
      <EmptyState
        emoji="✨"
        title="아직 받은 후기가 없어요"
        description="모임을 호스팅하거나 참가하면 후기가 여기 모여요."
      />
    )
  return (
    <div className={styles.reviews}>
      <div className={styles.reviewSummary}>
        <strong className={styles.reviewAvg}>{data.averageRating.toFixed(1)}</strong>
        <span className={styles.reviewStars} aria-label={`${data.averageRating}점`}>
          {'★'.repeat(Math.round(data.averageRating))}
          {'☆'.repeat(5 - Math.round(data.averageRating))}
        </span>
        <span className={styles.reviewCount}>총 {data.count}개 후기</span>
      </div>
      <ul className={styles.reviewList}>
        {data.reviews.map((r) => (
          <li key={r.id}>
            <div className={styles.reviewHead}>
              <span className={styles.reviewStars}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </span>
              <time>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</time>
            </div>
            <p>{r.body}</p>
            {r.hostReply && (
              <div className={styles.reviewReply}>
                <strong>
                  <Icon name="chat" size={0.9} /> 내 답글
                </strong>
                <p>{r.hostReply}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
