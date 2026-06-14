import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { api } from '@infrastructure/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './DerivedPartyManager.module.css'

import type {
  CreateDerivedPartyDto,
  CreateDerivedPartyResponseDto,
  DerivedInviteChannel,
  DerivedPartyCandidateDto,
  PartyCategory,
  SendPartyInvitationsDto,
  SendPartyInvitationsResponseDto,
} from '@rotifolk/shared'

interface DerivedPartyManagerProps {
  partyId: string
  originTitle: string
  originCategory: PartyCategory
  originCoverImageUrl?: string | null
  originStartAt?: string
  originVenueArea?: string
}

type TargetMode = 'popular' | 'balanced' | 'all'
type MessageTemplate = 'popular' | 'encore' | 'balanced'

const CATEGORY_OPTIONS: Array<{ value: PartyCategory; label: string }> = [
  { value: 'wine', label: '와인 로테이션' },
  { value: 'coffee', label: '커피/디저트' },
  { value: 'tea', label: '티 살롱' },
  { value: 'whisky', label: '위스키 페어링' },
  { value: 'cocktail', label: '칵테일 나이트' },
  { value: 'beer', label: '크래프트 비어' },
  { value: 'sake', label: '사케 테이스팅' },
  { value: 'natural-wine', label: '내추럴 와인' },
  { value: 'dessert', label: '디저트 모임' },
  { value: 'custom', label: '커스텀 모임' },
]

function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function buildDefaultStart(originStartAt?: string): string {
  const origin = originStartAt ? new Date(originStartAt) : new Date()
  const base = Number.isNaN(origin.getTime()) ? new Date() : origin
  const next = new Date(Math.max(Date.now() + 7 * 86400000, base.getTime() + 7 * 86400000))
  next.setMinutes(0, 0, 0)
  return toDateTimeLocalValue(next)
}

function buildTemplateText(
  template: MessageTemplate,
  originTitle: string,
  derivedTitle: string
): string {
  if (template === 'popular') {
    return `${originTitle}에서 좋은 반응을 많이 받은 멤버분께 먼저 초대드립니다. ${derivedTitle} 우선 초대장을 확인하고 가능한 일정을 알려주세요.`
  }
  if (template === 'balanced') {
    return `${originTitle}의 인기 멤버 밸런스를 맞춰 앵콜 모임을 열었습니다. 대화 흐름이 잘 맞았던 분들 중심으로 먼저 초대드려요.`
  }
  return `지난 ${originTitle}에 함께해 주셔서 감사합니다. 분위기가 좋았던 멤버들과 다시 만나는 앵콜 모임 ${derivedTitle}을 준비했어요.`
}

function genderLabel(gender?: string | null): string {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return '기타/비공개'
}

function formatVote(candidate: DerivedPartyCandidateDto): string {
  if (candidate.voteCount === null) return '비공개'
  return `${candidate.voteCount}표`
}

function pickRecommended(
  candidates: DerivedPartyCandidateDto[],
  mode: TargetMode,
  limit: number
): DerivedPartyCandidateDto[] {
  if (mode === 'all') return candidates.slice(0, limit)
  if (mode === 'balanced') {
    const perGroup = Math.max(1, Math.floor(limit / 2))
    const male = candidates.filter((c) => c.gender === 'male').slice(0, perGroup)
    const female = candidates.filter((c) => c.gender === 'female').slice(0, perGroup)
    const rest = candidates
      .filter((c) => c.gender !== 'male' && c.gender !== 'female')
      .slice(0, Math.max(0, limit - male.length - female.length))
    return [...male, ...female, ...rest]
  }
  const withSignals = candidates.filter((c) => c.inviteScore > 0)
  return (withSignals.length > 0 ? withSignals : candidates).slice(0, limit)
}

function absoluteInviteUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export default function DerivedPartyManager({
  partyId,
  originTitle,
  originCategory,
  originCoverImageUrl,
  originStartAt,
  originVenueArea,
}: DerivedPartyManagerProps) {
  const toast = useToast()
  const [derivedTitle, setDerivedTitle] = useState(`[인기 멤버 초청] ${originTitle} 앵콜`)
  const [category, setCategory] = useState<PartyCategory>(originCategory)
  const [limitCount, setLimitCount] = useState(12)
  const [targetMode, setTargetMode] = useState<TargetMode>('popular')
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string> | null>(null)
  const [startAt, setStartAt] = useState(() => buildDefaultStart(originStartAt))
  const [createdPartyId, setCreatedPartyId] = useState<string | null>(null)
  const [createdInvitePath, setCreatedInvitePath] = useState<string | null>(null)
  const [channel, setChannel] = useState<DerivedInviteChannel>('chat')
  const [messageTemplate, setMessageTemplate] = useState<MessageTemplate>('popular')
  const [customMsg, setCustomMsg] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<SendPartyInvitationsResponseDto | null>(null)

  const {
    data: candidates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['parties', partyId, 'derived-candidates'],
    queryFn: () => api.get<DerivedPartyCandidateDto[]>(`parties/${partyId}/derived-candidates`),
  })

  const recommendedCandidates = useMemo(
    () => pickRecommended(candidates ?? [], targetMode, limitCount),
    [candidates, limitCount, targetMode]
  )

  const selectedIds = useMemo(
    () => manualSelectedIds ?? new Set(recommendedCandidates.map((c) => c.id)),
    [manualSelectedIds, recommendedCandidates]
  )

  const selectedCandidates = useMemo(() => {
    const items = candidates ?? []
    return items.filter((c) => selectedIds.has(c.id))
  }, [candidates, selectedIds])

  const stats = useMemo(() => {
    const items = candidates ?? []
    const visibleVotes = items.filter((c) => c.voteCount !== null)
    const totalScore = items.reduce((sum, c) => sum + c.inviteScore, 0)
    return {
      total: items.length,
      selected: selectedCandidates.length,
      male: selectedCandidates.filter((c) => c.gender === 'male').length,
      female: selectedCandidates.filter((c) => c.gender === 'female').length,
      withPhone: selectedCandidates.filter((c) => c.hasPhone).length,
      avgVotes:
        visibleVotes.length > 0
          ? Math.round(
              (visibleVotes.reduce((sum, c) => sum + (c.voteCount ?? 0), 0) / visibleVotes.length) *
                10
            ) / 10
          : null,
      totalScore,
    }
  }, [candidates, selectedCandidates])

  const templateText = useMemo(
    () => buildTemplateText(messageTemplate, originTitle, derivedTitle),
    [derivedTitle, messageTemplate, originTitle]
  )
  const message = customMsg ?? templateText
  const createdInviteUrl = absoluteInviteUrl(createdInvitePath)

  const createDerive = useMutation({
    mutationFn: (body: CreateDerivedPartyDto) =>
      api.post<CreateDerivedPartyResponseDto>(`parties/${partyId}/derive`, body),
    onSuccess: (res) => {
      toast.show('파생 모임을 개설했어요', 'success')
      setCreatedPartyId(res.id)
      setCreatedInvitePath(res.invitePath)
      setSendResult(null)
    },
    onError: (err) => toast.show((err as Error).message, 'error'),
  })

  const sendInvites = useMutation({
    mutationFn: (body: SendPartyInvitationsDto) =>
      api.post<SendPartyInvitationsResponseDto>(`parties/${createdPartyId}/invitations`, body),
    onSuccess: (res) => {
      setSendResult(res)
      if (res.channel === 'sms' && res.skippedNoPhone > 0) {
        toast.show(`${res.count}명 문자 큐 등록, ${res.skippedNoPhone}명은 번호 없음`, 'warning')
      } else {
        toast.show(`${res.count}명에게 초대를 보냈어요`, 'success')
      }
    },
    onError: (err) => toast.show((err as Error).message, 'error'),
  })

  const applyRecommendation = () => {
    setManualSelectedIds(null)
  }

  const toggleCandidate = (id: string) => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev ?? selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCandidates.length === 0) {
      toast.show('초대 후보를 1명 이상 선택해 주세요', 'warning')
      return
    }
    createDerive.mutate({
      title: derivedTitle.trim(),
      category,
      maxParticipants: limitCount,
      startAt: new Date(startAt).toISOString(),
      targetUserIds: selectedCandidates.map((c) => c.id),
    })
  }

  const handleSendInvitations = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdPartyId) return
    if (selectedCandidates.length === 0) {
      toast.show('초대할 대상자가 없습니다', 'warning')
      return
    }
    sendInvites.mutate({
      targetUserIds: selectedCandidates.map((c) => c.id),
      channel,
      message: message.trim(),
    })
  }

  const copyInvite = async () => {
    if (!createdInviteUrl) return
    await navigator.clipboard.writeText(createdInviteUrl)
    toast.show('초대 링크를 복사했어요', 'success')
  }

  if (isLoading) {
    return (
      <section className={styles.shell}>
        <Loading label="앵콜 후보를 분석하는 중" />
      </section>
    )
  }

  if (isError) {
    return (
      <section className={styles.shell}>
        <EmptyState
          emoji="↺"
          title="후보 분석을 불러오지 못했어요"
          description="잠시 후 다시 시도하거나 파티 권한을 확인해 주세요."
        />
      </section>
    )
  }

  if (!candidates || candidates.length === 0) {
    return (
      <section className={styles.shell}>
        <EmptyState
          emoji="◇"
          title="초대할 회원 후보가 아직 없어요"
          description="확정 또는 체크인한 회원 참가자가 생기면 인기 멤버 기반 앵콜 초대를 만들 수 있어요."
        />
      </section>
    )
  }

  return (
    <section className={styles.shell} aria-labelledby="derived-party-title">
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Encore Campaign</p>
          <h2 id="derived-party-title">인기 멤버 기반 파생 모임</h2>
          <p>
            기존 파티의 호감 투표와 리뷰 신호를 기준으로 인기 남녀 후보를 선별하고, 새 초대장과
            채팅·문자 독려를 한 흐름에서 실행합니다.
          </p>
          <div className={styles.statGrid}>
            <span>
              <strong>{stats.total}</strong>
              후보
            </span>
            <span>
              <strong>{stats.selected}</strong>
              선택
            </span>
            <span>
              <strong>
                {stats.male}:{stats.female}
              </strong>
              남녀
            </span>
            <span>
              <strong>{stats.avgVotes ?? '-'}</strong>
              평균 표
            </span>
          </div>
        </div>

        <div className={styles.visual} aria-label={`${originTitle} 앵콜 초대 미리보기`}>
          {originCoverImageUrl ? (
            <img src={originCoverImageUrl} alt="" className={styles.coverImage} />
          ) : (
            <div className={styles.coverFallback} />
          )}
          <div className={styles.visualOverlay}>
            <span className={styles.originLabel}>{originVenueArea ?? 'Rotifolk'}</span>
            <strong>{originTitle}</strong>
            <div className={styles.avatarStack} aria-hidden="true">
              {selectedCandidates.slice(0, 5).map((c) => (
                <Avatar
                  key={c.id}
                  size="sm"
                  hue="var(--brand-apricot-600)"
                  pattern="gradient"
                  emoji={c.nickname[0] ?? 'R'}
                  imageSrc={c.avatarImage ?? null}
                  ring="soft"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.workspace}>
        <aside className={styles.controls} aria-label="파생 모임 설정">
          <form onSubmit={handleCreate} className={styles.form}>
            <div>
              <p className={styles.sectionEyebrow}>Step 1</p>
              <h3>새 모임 구성</h3>
            </div>

            <Input
              label="모임 이름"
              value={derivedTitle}
              onChange={(e) => setDerivedTitle(e.target.value)}
              required
            />

            <label className={styles.fieldLabel} htmlFor="derived-party-start">
              일정
            </label>
            <input
              id="derived-party-start"
              className={styles.input}
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />

            <label className={styles.fieldLabel} htmlFor="derived-party-category">
              카테고리
            </label>
            <select
              id="derived-party-category"
              className={styles.selectInput}
              value={category}
              onChange={(e) => setCategory(e.target.value as PartyCategory)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className={styles.fieldLabel} htmlFor="derived-party-limit">
              모집 정원
            </label>
            <input
              id="derived-party-limit"
              className={styles.input}
              type="number"
              min={2}
              max={80}
              value={limitCount}
              onChange={(e) => setLimitCount(Math.max(2, Number(e.target.value)))}
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={createDerive.isPending}
              disabled={selectedCandidates.length === 0}
            >
              파생 모임 개설
            </Button>
          </form>

          <form onSubmit={handleSendInvitations} className={styles.form}>
            <div>
              <p className={styles.sectionEyebrow}>Step 2</p>
              <h3>초대 독려 발송</h3>
            </div>

            {createdPartyId ? (
              <div className={styles.inviteReady}>
                <span>초대장 준비 완료</span>
                {createdInviteUrl && (
                  <button type="button" onClick={copyInvite} className={styles.linkButton}>
                    링크 복사
                  </button>
                )}
              </div>
            ) : (
              <p className={styles.helpText}>먼저 파생 모임을 개설하면 발송 채널이 활성화됩니다.</p>
            )}

            <label className={styles.fieldLabel} htmlFor="derived-party-channel">
              채널
            </label>
            <select
              id="derived-party-channel"
              className={styles.selectInput}
              value={channel}
              onChange={(e) => setChannel(e.target.value as DerivedInviteChannel)}
              disabled={!createdPartyId}
            >
              <option value="chat">서비스 채팅방</option>
              <option value="sms">SMS 문자 큐</option>
              <option value="push">인앱 알림</option>
            </select>

            <label className={styles.fieldLabel} htmlFor="derived-party-template">
              메시지 톤
            </label>
            <select
              id="derived-party-template"
              className={styles.selectInput}
              value={messageTemplate}
              onChange={(e) => {
                setMessageTemplate(e.target.value as MessageTemplate)
                setCustomMsg(null)
              }}
              disabled={!createdPartyId}
            >
              <option value="popular">인기 멤버 우선 초대</option>
              <option value="balanced">남녀 밸런스 앵콜</option>
              <option value="encore">감사형 앵콜 초대</option>
            </select>

            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setCustomMsg(e.target.value)}
              disabled={!createdPartyId}
              rows={5}
              aria-label="초대 메시지"
            />

            {channel === 'sms' && (
              <p className={styles.helpText}>
                선택 대상 {selectedCandidates.length}명 중 {stats.withPhone}명에게 문자 큐를 만들 수
                있어요.
              </p>
            )}

            <Button
              type="submit"
              variant="gold"
              isLoading={sendInvites.isPending}
              disabled={!createdPartyId || selectedCandidates.length === 0}
            >
              초대 발송
            </Button>

            {sendResult && (
              <div className={styles.resultBox} role="status">
                <strong>{sendResult.count ?? 0}명 발송 처리</strong>
                <span>
                  총 대상 {sendResult.totalTargets ?? selectedCandidates.length}명
                  {sendResult.skippedNoPhone ? ` · 번호 없음 ${sendResult.skippedNoPhone}명` : ''}
                </span>
                {sendResult.roomId && <Link to="/chat">채팅함에서 초대방 보기</Link>}
              </div>
            )}
          </form>
        </aside>

        <div className={styles.candidatePanel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.sectionEyebrow}>Audience</p>
              <h3>초대 대상 선별</h3>
            </div>
            <div className={styles.modeGroup} role="group" aria-label="추천 방식">
              {[
                ['popular', '득표순'],
                ['balanced', '인기 남녀'],
                ['all', '전체 상위'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={targetMode === value ? styles.modeActive : ''}
                  onClick={() => setTargetMode(value as TargetMode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.selectionBar}>
            <span>추천 {recommendedCandidates.length}명</span>
            <span>선택 {selectedCandidates.length}명</span>
            <Button type="button" variant="outline" size="sm" onClick={applyRecommendation}>
              추천 적용
            </Button>
          </div>

          <div className={styles.grid}>
            {candidates.map((candidate) => {
              const selected = selectedIds.has(candidate.id)
              return (
                <button
                  type="button"
                  key={candidate.id}
                  className={`${styles.candidateCard} ${selected ? styles.candidateSelected : ''}`}
                  onClick={() => toggleCandidate(candidate.id)}
                  aria-pressed={selected}
                >
                  <span className={styles.rank}>#{candidate.rank}</span>
                  <Avatar
                    size="lg"
                    hue="var(--brand-apricot-600)"
                    pattern="gradient"
                    emoji={candidate.nickname[0] ?? 'R'}
                    imageSrc={candidate.avatarImage ?? null}
                    ring={selected ? 'glow' : 'soft'}
                  />
                  <span className={styles.name}>{candidate.nickname}</span>
                  <span className={styles.gender}>{genderLabel(candidate.gender)}</span>
                  <span className={styles.vote}>{formatVote(candidate)}</span>
                  {candidate.rating !== null && (
                    <span className={styles.rating}>{candidate.rating.toFixed(1)} 리뷰</span>
                  )}
                  <span className={styles.phoneFlag}>
                    {candidate.hasPhone ? '문자 가능' : '인앱 전용'}
                  </span>
                  {candidate.topTags.length > 0 && (
                    <span className={styles.tags}>
                      {candidate.topTags.slice(0, 2).map((tag) => (
                        <small key={tag}>{tag}</small>
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
