import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { PartyCategory } from '@rotifolk/shared'
import { api } from '@services/api'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { Avatar } from '@components/ui/Avatar/Avatar'
import styles from './DerivedPartyManager.module.css'

interface Candidate {
  id: string
  nickname: string
  avatarId: string | null
  voteCount: number
  rating: number
  topTags: string[]
  phone: string
}

interface DerivedPartyManagerProps {
  partyId: string
  originTitle: string
  originCategory: PartyCategory
}

type InviteChannel = 'chat' | 'sms' | 'push'
type MessageTemplate = 'invite' | 'encore'

interface CreateDerivedResponse {
  id: string
}

interface SendInvitesResponse {
  ok?: boolean
  count?: number
}

function buildTemplateText(
  template: MessageTemplate,
  originTitle: string,
  derivedTitle: string,
): string {
  if (template === 'invite') {
    return `[초대] ${originTitle}의 최고 매너/인기 회원으로 추천되어, 스페셜 앵콜 로테이션 모임 [${derivedTitle}]에 우선 초청되셨습니다. 참여를 원하시면 아래 링크를 통해 확인해 주세요!`
  }
  return `[앵콜] 지난 ${originTitle} 모임의 뜨거운 성원에 감사드립니다. 당시 참여하셨던 멋진 멤버분들과 함께 다시 한 번 깊은 대화를 나눌 수 있는 앵콜 자리를 마련했으니 신청을 서둘러주세요!`
}

export default function DerivedPartyManager({
  partyId,
  originTitle,
  originCategory,
}: DerivedPartyManagerProps) {
  const toast = useToast()

  // 상태 관리
  const [derivedTitle, setDerivedTitle] = useState(`[인기 멤버 초청] ${originTitle} 앵콜 모임`)
  const [category, setCategory] = useState<PartyCategory>(originCategory)
  const [limitCount, setLimitCount] = useState(12)
  const [filterPopular, setFilterPopular] = useState(true)

  // 파생 파티 생성 완료 후 활성화될 상태
  const [createdPartyId, setCreatedPartyId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [channel, setChannel] = useState<InviteChannel>('chat')
  const [messageTemplate, setMessageTemplate] = useState<MessageTemplate>('invite')
  const [customMsg, setCustomMsg] = useState<string | null>(null)

  // 1. 투표 및 피드백 상위 후보자 리스트 조회
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['parties', partyId, 'derived-candidates'],
    queryFn: () => api.get<Candidate[]>(`parties/${partyId}/derived-candidates`),
  })

  // 2. 파생 파티 생성 Mutation
  const createDerive = useMutation({
    mutationFn: (body: {
      title: string
      category: string
      maxParticipants: number
      targetUserIds: string[]
    }) => api.post<CreateDerivedResponse>(`parties/${partyId}/derive`, body),
    onSuccess: (res) => {
      toast.show('파생 모임이 성공적으로 개설되었습니다!', 'success')
      setCreatedPartyId(res.id)
    },
    onError: (err) => toast.show((err as Error).message, 'error'),
  })

  // 3. 초대 발송 Mutation
  const sendInvites = useMutation({
    mutationFn: (body: { targetUserIds: string[]; channel: string; template: string }) =>
      api.post<SendInvitesResponse>(`parties/${createdPartyId}/invitations`, body),
    onSuccess: (res) => {
      toast.show(`성공적으로 ${res.count ?? 0}명에게 초대장을 발송했습니다.`, 'success')
      setIsSending(false)
    },
    onError: (err) => {
      toast.show((err as Error).message, 'error')
      setIsSending(false)
    },
  })

  // 초대 대상자 목록
  const targetCandidates = candidates?.filter((c) => !filterPopular || c.voteCount >= 5) ?? []

  const templateText = useMemo(
    () => buildTemplateText(messageTemplate, originTitle, derivedTitle),
    [derivedTitle, messageTemplate, originTitle],
  )

  // 가상 프로그레스 애니메이션 핸들러
  const handleSendInvitations = (e: React.FormEvent) => {
    e.preventDefault()
    if (targetCandidates.length === 0) {
      toast.show('초대할 대상자가 없습니다.', 'warning')
      return
    }
    setIsSending(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          // 실제 API 호출 연계
          sendInvites.mutate({
            targetUserIds: targetCandidates.map((c) => c.id),
            channel,
            template: customMsg ?? templateText,
          })
          return 100
        }
        return prev + 5
      })
    }, 80)
  }

  if (isLoading) return null

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>👑 파생 파티 개설 및 초대 매니저</h2>
      <p className={styles.desc}>
        이전 모임에서 매력 피드백(투표/태그)을 많이 획득한 인기 멤버들을 타겟으로 스페셜 앵콜 또는
        파생 소셜링을 개설해 보세요.
      </p>

      {/* 1. 인기 멤버 피드백 현황 */}
      <div className={styles.gridTitle}>
        <span>🎯 이번 모임 베스트 멤버 피드백 현황</span>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={filterPopular}
            onChange={(e) => setFilterPopular(e.target.checked)}
          />
          5표 이상 획득자만 자동 타겟팅
        </label>
      </div>

      <div className={styles.grid}>
        {candidates?.map((c) => {
          const isTargeted = !filterPopular || c.voteCount >= 5
          return (
            <div
              key={c.id}
              className={`${styles.candidateCard} ${!isTargeted ? styles.candidateCardDimmed : ''}`}
            >
              <span className={styles.badge}>👍 {c.voteCount}표</span>
              <Avatar
                size="md"
                hue="var(--brand-burgundy-700)"
                pattern="gradient"
                emoji={c.nickname[0]}
                ring="soft"
              />
              <span className={styles.name}>{c.nickname}</span>
              <span className={styles.rating}>⭐ {c.rating}</span>
              <div className={styles.tags}>
                {c.topTags.map((t, idx) => (
                  <span key={idx} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!createdPartyId ? (
        // ---------------- 폼 1: 파생 파티 생성 ----------------
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            createDerive.mutate({
              title: derivedTitle.trim(),
              category,
              maxParticipants: Number(limitCount),
              targetUserIds: targetCandidates.map((c) => c.id),
            })
          }}
        >
          <h3 className={styles.formTitle}>새로운 앵콜 파티 정보 입력</h3>
          <div className={styles.formGrid}>
            <Input
              label="새 모임 이름"
              value={derivedTitle}
              onChange={(e) => setDerivedTitle(e.target.value)}
              required
            />
            <div>
              <label htmlFor="derived-party-category" className={styles.fieldLabel}>
                카테고리
              </label>
              <select
                id="derived-party-category"
                className={styles.selectInput}
                value={category}
                onChange={(e) => setCategory(e.target.value as PartyCategory)}
              >
                <option value="wine">와인 로테이션</option>
                <option value="coffee">커피/디저트 모임</option>
                <option value="tea">전통 차 시음회</option>
                <option value="whisky">위스키 페어링</option>
              </select>
            </div>
          </div>
          <div className={styles.formGrid}>
            <Input
              label="정원 설정 (명)"
              type="number"
              value={limitCount}
              onChange={(e) => setLimitCount(Math.max(2, Number(e.target.value)))}
              required
            />
            <div className={styles.alignEnd}>
              <Button type="submit" variant="primary" disabled={createDerive.isPending}>
                새 파생 모임 개설
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className={styles.invitationSection}>
          <h3 className={styles.invTitle}>💌 개설 완료! 대상자에게 초대 및 참여 독려 발송</h3>
          <p className={styles.invitationDesc}>
            선정된 인기 멤버 **{targetCandidates.length}명**에게 알림 및 문자 초대장을 일괄 발송하여
            모임 참여를 독려합니다.
          </p>

          <form onSubmit={handleSendInvitations}>
            <div className={`${styles.formGrid} ${styles.formGridSpaced}`}>
              <div>
                <label htmlFor="derived-party-channel" className={styles.fieldLabel}>
                  발송 채널
                </label>
                <select
                  id="derived-party-channel"
                  className={styles.selectInput}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as InviteChannel)}
                >
                  <option value="chat">사내/서비스 1:1 대화방 초대장 전송</option>
                  <option value="sms">SMS 문자 메시지 & 알림톡 발송</option>
                  <option value="push">앱 내 푸시 알림 전송</option>
                </select>
              </div>

              <div>
                <label htmlFor="derived-party-template" className={styles.fieldLabel}>
                  메시지 프리셋 템플릿
                </label>
                <select
                  id="derived-party-template"
                  className={styles.selectInput}
                  value={messageTemplate}
                  onChange={(e) => {
                    setMessageTemplate(e.target.value as MessageTemplate)
                    setCustomMsg(null)
                  }}
                >
                  <option value="invite">A: [인기 회원 초청] 스페셜 우선 입장권</option>
                  <option value="encore">B: [앵콜 초대] 이전 모임 동반 재회 모임</option>
                </select>
              </div>
            </div>

            <div className={styles.messageField}>
              <label htmlFor="derived-party-message" className={styles.fieldLabel}>
                메시지 내용 커스텀
              </label>
              <textarea
                id="derived-party-message"
                className={styles.textarea}
                value={customMsg ?? templateText}
                onChange={(e) => setCustomMsg(e.target.value)}
                required
              />
            </div>

            {isSending && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressLabel}>
                  {channel === 'sms' ? 'SMS 문자 발송 중...' : '초대 대화방 생성 중...'} ({progress}
                  %)
                </span>
              </div>
            )}

            <div className={styles.actionRow}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatedPartyId(null)}
                disabled={isSending}
              >
                처음으로
              </Button>
              <Button type="submit" variant="primary" isLoading={isSending}>
                {channel === 'sms' ? '문자 일괄 전송' : '초대장 전송 및 독려'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
