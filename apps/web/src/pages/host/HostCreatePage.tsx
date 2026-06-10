import { useEffect, useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import type {
  CreatePartyDto,
  PartyFormat,
  RotationFormat,
  ContactExchangePolicy,
  MatchScope,
  ConnectionChannel,
  ConnectionMode,
  MaritalStatus,
  VerificationField,
  ChildrenPolicy,
  NoteDelivery,
} from '@rotifolk/shared'
import {
  CreatePartySchema,
  CONNECTION_CHANNELS,
  CONNECTION_CHANNEL_ORDER,
  CHILDREN_POLICY_LABEL,
  MARITAL_STATUS_LABEL,
  VERIFICATION_FIELD_LABEL,
  CONTACT_EXCHANGE_POLICY_LABEL,
  PARTY_FORMAT_LABEL,
  ROTATION_FORMAT_LABEL,
} from '@rotifolk/shared'
import { useCreateParty } from '@features/parties/queries'
import { clearHostDraft, loadHostDraft, saveHostDraft } from '@features/parties/hostDraft'
import { useVenues } from '@features/venues/queries'
import { ALL_CATEGORIES, CATEGORY_META } from '@features/categories/meta'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './HostCreate.module.css'

const DEFAULTS: Partial<CreatePartyDto> = {
  config: {
    category: 'wine',
    rotationMode: 'round-robin-pair',
    roundDurationSec: 300,
    totalRounds: 6,
    breakBetweenRoundsSec: 30,
    enableMidMatching: true,
    enableFinalMatching: true,
    enableQuiz: true,
    enableQuestionCards: true,
    enableLiveOrders: true,
    enableAvatarOnly: false,
    format: 'rotation',
    rotationFormat: 'one-on-one',
    groupSize: 2,
    matchScope: 'mutual-only',
    maxMatchesPerPerson: 3,
    contactExchangePolicy: 'mutual-consent',
    connectionMode: 'chat',
    connectionChannels: ['chat'],
    groupAfterParty: false,
    enableNotes: true,
    noteDelivery: 'party-end',
    revealPopular: true,
    noteQuota: 5,
    enableConversationKit: true,
  },
  pricing: {
    basePriceKRW: 36000,
    drinkPackage: 'per-glass',
    snackPackage: 'none',
    refundDeadlineHours: 24,
    pricingRules: [],
  },
  recruitment: {
    genderRatioTarget: 'any',
    ratioTolerance: 1,
    maleCap: null,
    femaleCap: null,
    minMale: null,
    minFemale: null,
    autoCancelAt: null,
    autoCancelReason: null,
  },
  minParticipants: 6,
  maxParticipants: 12,
  tags: [],
}

const ROTATION_OPTIONS = [
  { value: 'round-robin-pair', label: '1:1 라운드 로빈', desc: '모두가 한 번씩 모든 사람과' },
  { value: 'round-robin-trio', label: '3인 1조 로테이션', desc: '3인 그룹으로 매 라운드 셔플' },
  { value: 'speed-circle', label: '스피드 서클', desc: '원형 배치로 빠른 회전' },
  { value: 'random-shuffle', label: '랜덤 셔플', desc: '예측 불가, 매번 다르게' },
  { value: 'host-curated', label: '호스트 큐레이션', desc: '내가 매칭을 직접 짤게요' },
] as const

const FORMAT_OPTIONS: { value: PartyFormat; desc: string }[] = [
  { value: 'rotation', desc: '5분 라운드로 모두와 짧게 회전' },
  { value: 'note-ting', desc: '자유롭게 어울리며 쪽지를 주고받아요' },
  { value: 'mixer', desc: '정해진 매칭 없이 느슨한 소셜 믹서' },
]

const ROTATION_FORMAT_OPTIONS: { value: RotationFormat; desc: string }[] = [
  { value: 'one-on-one', desc: '한 번에 한 명씩, 가장 집중도 높은 대화' },
  { value: 'many-to-one', desc: '한 명을 그룹이 둘러싸는 핫시트' },
  { value: 'many-to-many', desc: '그룹 테이블이 통째로 회전' },
]

const MATCH_SCOPE_OPTIONS: { value: MatchScope; label: string; desc: string }[] = [
  { value: 'mutual-only', label: '상호 매칭만', desc: '서로 지목한 사이만 연결돼요' },
  { value: 'top-n', label: '상위 N명', desc: '누적 호감 상위 N명까지 연결' },
  {
    value: 'mutual-plus-top-n',
    label: '상호+상위N',
    desc: '상호는 우선, 부족하면 상위 N명으로 보완',
  },
  { value: 'all-participants', label: '전원 연결', desc: '참가자 모두를 연결' },
]

const CONTACT_EXCHANGE_OPTIONS: {
  value: ContactExchangePolicy
  label: string
  desc: string
}[] = [
  {
    value: 'mutual-consent',
    label: `연락처 ${CONTACT_EXCHANGE_POLICY_LABEL['mutual-consent']}`,
    desc: '양쪽 모두 공개 동의할 때만 보입니다.',
  },
  {
    value: 'chat-only',
    label: `연결 ${CONTACT_EXCHANGE_POLICY_LABEL['chat-only']}`,
    desc: '매칭 후 앱 내 채팅만 열고 외부 채널은 잠급니다.',
  },
  {
    value: 'open-after-match',
    label: `즉시 공개 ${CONTACT_EXCHANGE_POLICY_LABEL['open-after-match']}`,
    desc: '마감 후 매칭에 등록된 채널을 바로 공개해요.',
  },
  {
    value: 'request-approval',
    label: `요청 후 승인`,
    desc: '채팅은 바로 열고, 외부 연락처는 상대가 승인할 때만 공개해요.',
  },
]

const NOTE_DELIVERY_OPTIONS: { value: NoteDelivery; label: string; desc: string }[] = [
  { value: 'instant', label: '즉시', desc: '쓰는 즉시 상대에게 도착' },
  { value: 'party-end', label: '파티 종료 후', desc: '여운을 남기게 종료 후 한꺼번에' },
]

const RATIO_PRESETS: { value: string; label: string }[] = [
  { value: 'any', label: '상관없음' },
  { value: '1:1', label: '1:1' },
  { value: '2:3', label: '2:3' },
  { value: '5:3', label: '5:3' },
]

const MARITAL_REQ_OPTIONS: MaritalStatus[] = ['single', 'divorced', 'widowed']
const VERIFY_OPTIONS: VerificationField[] = [
  'identity',
  'job',
  'company',
  'income',
  'marital',
  'education',
]
const CHILDREN_OPTS: ChildrenPolicy[] = ['any', 'has', 'none']
const numOrNull = (v: string) => (v === '' ? null : Number(v))

// '처음부터'용 빈 폼 값. RHF reset은 누락된 키의 입력 DOM을 비우지 않고 되읽으므로 전부 명시한다.
const BLANK_FORM: Partial<CreatePartyDto> = {
  ...DEFAULTS,
  title: '',
  description: '',
  venueId: '',
  startAt: '',
  endAt: '',
  maleAgeMin: null,
  maleAgeMax: null,
  femaleAgeMin: null,
  femaleAgeMax: null,
  requiredVerifications: [],
  maritalRequirement: [],
  childrenPolicy: 'any',
}
// 빈 폼은 드래프트로 저장하지 않는다 — reset이 일으키는 후속 알림(필드어레이 재동기화 등)이
// '처음부터' 직후 빈 폼을 도로 저장해 복원 배지를 되살리는 것을 내용 기준으로 차단.
const BLANK_FORM_JSON = JSON.stringify(BLANK_FORM)

/** 드래프트를 DEFAULTS 위에 얹는다. 섹션은 얕은 병합으로 새로 생긴 필드가 비지 않게 한다. */
function withDraft(draft: Partial<CreatePartyDto> | null) {
  if (!draft) return DEFAULTS
  return {
    ...DEFAULTS,
    ...draft,
    config: { ...DEFAULTS.config, ...draft.config },
    pricing: { ...DEFAULTS.pricing, ...draft.pricing },
    recruitment: { ...DEFAULTS.recruitment, ...draft.recruitment },
  }
}

/** ISO 문자열을 datetime-local 입력 값(로컬 시각)으로 변환. */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

export default function HostCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: venues } = useVenues({ partnered: true })
  const create = useCreateParty()

  // 드래프트는 마운트 시 1회 읽어 defaultValues로 주입 — 새로고침·실수 이탈에도 입력이 살아남는다.
  const [draft] = useState(() => loadHostDraft())
  const [draftRestored, setDraftRestored] = useState(draft != null)
  const [confirmRestart, setConfirmRestart] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePartyDto>({
    resolver: zodResolver(CreatePartySchema) as never,
    defaultValues: withDraft(draft) as never,
  })

  const watched = watch()
  const priceRules = useFieldArray({ control, name: 'pricing.pricingRules' })
  const [step, setStep] = useState<'concept' | 'venue' | 'rounds' | 'match' | 'price'>('concept')

  // 입력이 멈추고 600ms 뒤 드래프트 저장. 빈 폼('처음부터' 직후 포함)은 저장하지 않는다.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = watch((data) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (JSON.stringify(data) !== BLANK_FORM_JSON) saveHostDraft(data)
      }, 600)
    })
    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [watch])

  /** 드래프트를 버리고 백지에서 다시 시작. */
  const restartFromScratch = () => {
    clearHostDraft()
    reset(BLANK_FORM as never)
    setDraftRestored(false)
    setConfirmRestart(false)
    setStep('concept')
  }

  const STEP_ORDER = ['concept', 'venue', 'rounds', 'match', 'price'] as const
  const currentIndex = STEP_ORDER.indexOf(step)

  const next: Record<typeof step, typeof step | null> = {
    concept: 'venue',
    venue: 'rounds',
    rounds: 'match',
    match: 'price',
    price: null,
  }
  const prev: Record<typeof step, typeof step | null> = {
    concept: null,
    venue: 'concept',
    rounds: 'venue',
    match: 'rounds',
    price: 'match',
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      const created = await create.mutateAsync(data)
      clearHostDraft()
      toast.show('파티가 열렸어요! ✨', 'success')
      navigate(`/host/parties/${created.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  })

  return (
    <form onSubmit={onSubmit} className={styles.page}>
      <header className={`container ${styles.head}`}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.kicker}>HOST · NEW ROTATION</p>
            <h1 className={styles.title}>새 로테이션 파티 만들기</h1>
          </div>
          <p className={styles.stepCount}>
            <b>{currentIndex + 1}</b> / {STEP_ORDER.length}
          </p>
        </div>
        <div className={styles.stepper} role="tablist" aria-label="파티 개설 단계">
          {STEP_ORDER.map((s, i) => {
            const isActive = step === s
            const isDone = i < currentIndex
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${
                  isDone ? styles.stepDone : ''
                }`}
                onClick={() => setStep(s)}
              >
                <span className={styles.stepDot} aria-hidden="true">
                  {isDone ? '✓' : i + 1}
                </span>
                <span className={styles.stepLabelText}>{STEP_LABEL[s]}</span>
              </button>
            )
          })}
        </div>
      </header>

      <div className={`container ${styles.body}`}>
        {draftRestored && (
          <div className={styles.draftBar} role="status">
            <Badge tone="gold" size="sm">
              임시저장
            </Badge>
            {confirmRestart ? (
              <>
                <span className={styles.draftText}>
                  작성 중이던 내용을 지우고 처음부터 시작할까요?
                </span>
                <div className={styles.draftActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setConfirmRestart(false)}
                  >
                    계속 작성
                  </Button>
                  <Button variant="danger" size="sm" type="button" onClick={restartFromScratch}>
                    지우고 시작
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className={styles.draftText}>
                  이어서 작성할 수 있게 임시저장본을 불러왔어요.
                </span>
                <div className={styles.draftActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setConfirmRestart(true)}
                  >
                    처음부터
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'concept' && (
          <Card padding="lg" className={styles.card}>
            <div className={styles.stepHead}>
              <h2 className={styles.h2}>어떤 모임인가요?</h2>
              <p className={styles.sectionLead}>
                카테고리가 파티의 무드를 정해요. 제목과 소개로 첫인상을 채워주세요.
              </p>
            </div>

            <div className={styles.group}>
              <label className={styles.fieldLabel}>카테고리</label>
              <Controller
                control={control}
                name="config.category"
                render={({ field }) => (
                  <div className={styles.catGrid}>
                    {ALL_CATEGORIES.map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        className={`${styles.catBtn} ${field.value === c.value ? styles.catActive : ''}`}
                        style={{
                          background:
                            field.value === c.value ? c.bgGradient : 'var(--color-surface)',
                          color:
                            field.value === c.value
                              ? 'var(--color-primary-fg)'
                              : 'var(--color-text)',
                        }}
                        onClick={() => field.onChange(c.value)}
                      >
                        <span className={styles.catBtnEmoji}>{c.emoji}</span>
                        <span>{c.shortLabel}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className={styles.fieldGroup}>
              <Input
                label="파티 제목"
                placeholder="한남 루프탑 와인 로테이션 vol.13"
                error={errors.title?.message}
                {...register('title')}
              />
              <div>
                <label className={styles.fieldLabel}>소개</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="이번 라운드의 컨셉, 어떤 사람들이 오면 좋을지, 분위기를 자유롭게 적어주세요. 20자 이상."
                  {...register('description')}
                />
                {errors.description && <p className={styles.error}>{errors.description.message}</p>}
              </div>
            </div>
          </Card>
        )}

        {step === 'venue' && (
          <Card padding="lg" className={styles.card}>
            <div className={styles.stepHead}>
              <h2 className={styles.h2}>어디서 만날까요?</h2>
              <p className={styles.sectionLead}>
                제휴 라운지·와인바·카페에서 고르거나, 직접 입력한 장소도 사용할 수 있어요.
              </p>
            </div>

            <Controller
              control={control}
              name="venueId"
              render={({ field }) => (
                <div className={styles.venueList}>
                  {venues?.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className={`${styles.venueCard} ${field.value === v.id ? styles.venueActive : ''}`}
                      onClick={() => field.onChange(v.id)}
                    >
                      <div className={styles.venueImg}>
                        {v.photos[0] ? (
                          <img src={v.photos[0]} alt="" />
                        ) : (
                          <div className={styles.venuePh}>🏛️</div>
                        )}
                      </div>
                      <div className={styles.venueInfo}>
                        <div className={styles.venueHead}>
                          <strong>{v.name}</strong>
                          {v.partnered && (
                            <Badge tone="gold" size="sm">
                              제휴
                            </Badge>
                          )}
                        </div>
                        <div className={styles.venueMeta}>
                          📍 {v.area} · 최대 {v.capacity}명 · 시간당{' '}
                          {v.pricePerHourKRW.toLocaleString()}원
                        </div>
                        <div className={styles.venueAmenities}>
                          {v.amenities.slice(0, 3).map((a) => (
                            <Badge key={a} tone="neutral" size="sm">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />

            <div className={styles.group}>
              <div className={styles.groupHead}>
                <label className={styles.fieldLabel}>언제 열려요?</label>
                <p className={styles.fieldHelp}>참가자에게 보여줄 시작과 종료 시각이에요.</p>
              </div>
              <div className={styles.dateRow}>
                <Input
                  type="datetime-local"
                  label="시작 시각"
                  defaultValue={toLocalInput(watched.startAt)}
                  onChange={(e) => {
                    if (e.target.value) setValue('startAt', new Date(e.target.value).toISOString())
                  }}
                />
                <Input
                  type="datetime-local"
                  label="종료 시각"
                  defaultValue={toLocalInput(watched.endAt)}
                  onChange={(e) => {
                    if (e.target.value) setValue('endAt', new Date(e.target.value).toISOString())
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {step === 'rounds' && (
          <Card padding="lg" className={styles.card}>
            <div className={styles.stepHead}>
              <h2 className={styles.h2}>라운드를 어떻게 돌릴까요?</h2>
              <p className={styles.sectionLead}>
                회전 방식과 시간을 정하고, 라이브에서 켤 도구를 골라요.
              </p>
            </div>

            <div className={styles.group}>
              <label className={styles.fieldLabel}>매칭 방식</label>
              <Controller
                control={control}
                name="config.rotationMode"
                render={({ field }) => (
                  <div className={styles.modeList}>
                    {ROTATION_OPTIONS.map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                        onClick={() => field.onChange(o.value)}
                      >
                        <strong>{o.label}</strong>
                        <span>{o.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className={styles.group}>
              <div className={styles.groupHead}>
                <label className={styles.fieldLabel}>시간과 인원</label>
                <p className={styles.fieldHelp}>라운드 길이·휴식과 모집 정원을 정해요.</p>
              </div>
              <div className={styles.fieldGroup}>
                <Input
                  type="number"
                  label="총 라운드 수"
                  {...register('config.totalRounds', { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  label="라운드 시간 (초)"
                  hint="5분 = 300초"
                  {...register('config.roundDurationSec', { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  label="라운드 사이 휴식 (초)"
                  {...register('config.breakBetweenRoundsSec', { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  label="최소 인원"
                  {...register('minParticipants', { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  label="최대 인원"
                  {...register('maxParticipants', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.groupHead}>
                <h3 className={styles.sectionTitle}>라이브 도구</h3>
                <p className={styles.sectionNote}>
                  라운드 중·후에 켤 기능이에요. 나중에도 바꿀 수 있어요.
                </p>
              </div>
              <div className={styles.toggleGrid}>
                <Toggle
                  checked={watched.config?.enableMidMatching}
                  onChange={(v) => setValue('config.enableMidMatching', v)}
                  label="라운드 호감 표시"
                  desc="라운드 종료 직후 '좋아요' 비공개 투표"
                />
                <Toggle
                  checked={watched.config?.enableFinalMatching}
                  onChange={(v) => setValue('config.enableFinalMatching', v)}
                  label="최종 매칭"
                  desc="마지막에 상호 매칭만 공개"
                />
                <Toggle
                  checked={watched.config?.enableQuiz}
                  onChange={(v) => setValue('config.enableQuiz', v)}
                  label="라이브 퀴즈"
                  desc="호스트가 라운드 사이 퀴즈를 발사"
                />
                <Toggle
                  checked={watched.config?.enableQuestionCards}
                  onChange={(v) => setValue('config.enableQuestionCards', v)}
                  label="질문 카드"
                  desc="4단계 깊이로 어색함 해소"
                />
                <Toggle
                  checked={watched.config?.enableLiveOrders}
                  onChange={(v) => setValue('config.enableLiveOrders', v)}
                  label="라이브 주문"
                  desc="음료·안주 그 자리에서 추가"
                />
                <Toggle
                  checked={watched.config?.enableAvatarOnly}
                  onChange={(v) => setValue('config.enableAvatarOnly', v)}
                  label="아바타 모드"
                  desc="실명 X, 닉네임 + 아바타만 노출"
                />
              </div>
            </div>
          </Card>
        )}

        {step === 'match' && (
          <Card padding="lg" className={styles.card}>
            <div className={styles.stepHead}>
              <h2 className={styles.h2}>어떻게 만나고 이어질까요?</h2>
              <p className={styles.sectionLead}>
                만남의 형태, 끝나고 이어지는 방식, 모집 성비를 차례로 정해요.
              </p>
            </div>

            {/* —— Sub-section A: 만남의 형태 —— */}
            <div className={styles.section}>
              <div className={styles.groupHead}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.num}>A</span> 만남의 형태
                </h3>
                <p className={styles.sectionNote}>라운드가 어떤 모양으로 굴러갈지 정해요.</p>
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>모임 포맷</label>
                <Controller
                  control={control}
                  name="config.format"
                  render={({ field }) => (
                    <div className={styles.modeList}>
                      {FORMAT_OPTIONS.map((o) => (
                        <button
                          type="button"
                          key={o.value}
                          className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                          onClick={() => field.onChange(o.value)}
                        >
                          <strong>{PARTY_FORMAT_LABEL[o.value]}</strong>
                          <span>{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>대화 구조</label>
                <Controller
                  control={control}
                  name="config.rotationFormat"
                  render={({ field }) => (
                    <div className={styles.modeList}>
                      {ROTATION_FORMAT_OPTIONS.map((o) => (
                        <button
                          type="button"
                          key={o.value}
                          className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                          onClick={() => field.onChange(o.value)}
                        >
                          <strong>{ROTATION_FORMAT_LABEL[o.value]}</strong>
                          <span>{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {watched.config?.rotationFormat !== 'one-on-one' && (
                  <div className={styles.subField}>
                    <Input
                      type="number"
                      label="그룹 크기"
                      hint="한 테이블에 함께 앉는 인원 (2~12명)"
                      {...register('config.groupSize', { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* —— Sub-section B: 매칭과 연결 —— */}
            <div className={styles.section}>
              <div className={styles.groupHead}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.num}>B</span> 매칭과 연결
                </h3>
                <p className={styles.sectionNote}>누구와, 어떤 통로로 이어질지 정해요.</p>
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>매칭 범위</label>
                <Controller
                  control={control}
                  name="config.matchScope"
                  render={({ field }) => (
                    <div className={styles.modeList}>
                      {MATCH_SCOPE_OPTIONS.map((o) => (
                        <button
                          type="button"
                          key={o.value}
                          className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                          onClick={() => field.onChange(o.value)}
                        >
                          <strong>{o.label}</strong>
                          <span>{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {(watched.config?.matchScope === 'top-n' ||
                  watched.config?.matchScope === 'mutual-plus-top-n') && (
                  <div className={styles.subField}>
                    <Input
                      type="number"
                      label="연결할 인원 수 (N)"
                      hint="한 사람당 최대 몇 명까지 연결할지 (1~20명)"
                      {...register('config.maxMatchesPerPerson', { valueAsNumber: true })}
                    />
                  </div>
                )}
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>연락처 공개 방식</label>
                <Controller
                  control={control}
                  name="config.contactExchangePolicy"
                  render={({ field }) => (
                    <div className={styles.modeList} role="group" aria-label="연락처 공개 방식">
                      {CONTACT_EXCHANGE_OPTIONS.map((o) => {
                        const isActive = field.value === o.value
                        return (
                          <button
                            type="button"
                            key={o.value}
                            aria-pressed={isActive}
                            className={`${styles.modeBtn} ${isActive ? styles.modeActive : ''}`}
                            onClick={() => {
                              field.onChange(o.value)
                              if (o.value === 'chat-only') {
                                setValue('config.connectionChannels', ['chat'])
                              }
                            }}
                          >
                            <strong>{o.label}</strong>
                            <span>{o.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
              </div>

              <div className={styles.group}>
                <div className={styles.groupHead}>
                  <label className={styles.fieldLabel}>연결 매체</label>
                  <p className={styles.fieldHelp}>
                    {watched.config?.contactExchangePolicy === 'chat-only'
                      ? '현재 정책상 채팅만 공개됩니다. 외부 채널은 잠긴 상태입니다.'
                      : watched.config?.contactExchangePolicy === 'open-after-match'
                        ? '매칭 성사 즉시 공개 가능한 채널을 바로 노출해요.'
                        : watched.config?.contactExchangePolicy === 'request-approval'
                          ? '채팅은 바로 열고, 인스타·카톡·번호는 상대에게 요청한 뒤 승인되면 보여요.'
                          : '양쪽이 동의하고 공개 동의한 채널만 단계적으로 열려요. 채팅은 늘 켜져요.'}
                  </p>
                </div>
                <Controller
                  control={control}
                  name="config.connectionChannels"
                  render={({ field }) => {
                    const selected: ConnectionChannel[] = field.value ?? ['chat']
                    const policy = watched.config?.contactExchangePolicy
                    const toggle = (ch: ConnectionChannel) => {
                      if (policy === 'chat-only' || ch === 'chat') return
                      const next = selected.includes(ch)
                        ? selected.filter((c) => c !== ch)
                        : [...selected, ch]
                      if (!next.includes('chat')) next.push('chat')
                      next.sort(
                        (a, b) =>
                          CONNECTION_CHANNEL_ORDER.indexOf(a) - CONNECTION_CHANNEL_ORDER.indexOf(b),
                      )
                      field.onChange(next)
                      const mode: ConnectionMode = next.includes('phone')
                        ? next.includes('chat')
                          ? 'both'
                          : 'phone'
                        : 'chat'
                      setValue('config.connectionMode', mode)
                    }
                    return (
                      <div className={styles.modeList} role="group" aria-label="연결 매체">
                        {CONNECTION_CHANNEL_ORDER.map((ch) => {
                          const meta = CONNECTION_CHANNELS[ch]
                          const on = selected.includes(ch)
                          return (
                            <button
                              type="button"
                              key={ch}
                              aria-pressed={on}
                              className={`${styles.modeBtn} ${on ? styles.modeActive : ''} ${
                                policy === 'chat-only' ? styles.modeDisabled : ''
                              }`}
                              onClick={() => toggle(ch)}
                              disabled={policy === 'chat-only' && ch !== 'chat'}
                            >
                              <strong>
                                {meta.icon} {meta.label}
                                {ch === 'chat' ? ' · 항상' : ''}
                              </strong>
                              <span>{meta.commitmentLabel}</span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  }}
                />
              </div>

              <div className={styles.group}>
                <div className={styles.groupHead}>
                  <label className={styles.fieldLabel}>대화 옵션</label>
                  <p className={styles.fieldHelp}>대화를 데워줄 보조 도구예요.</p>
                </div>
                <div className={styles.toggleGrid}>
                  <Toggle
                    checked={watched.config?.groupAfterParty}
                    onChange={(v) => setValue('config.groupAfterParty', v)}
                    label="종료 후 그룹채팅"
                    desc="파티가 끝나면 참가자 단체방을 열어요"
                  />
                  <Toggle
                    checked={watched.config?.enableNotes}
                    onChange={(v) => setValue('config.enableNotes', v)}
                    label="쪽지"
                    desc="라운드 파트너에게 손글씨 같은 쪽지를"
                  />
                  <Toggle
                    checked={watched.config?.enableConversationKit}
                    onChange={(v) => setValue('config.enableConversationKit', v)}
                    label="대화 도우미"
                    desc="어색할 때 꺼내 쓰는 질문·미션 덱"
                  />
                  <Toggle
                    checked={watched.config?.revealPopular}
                    onChange={(v) => setValue('config.revealPopular', v)}
                    label="오늘의 인기남/인기녀"
                    desc="종료 후 가장 호감받은 멤버를 공개해요"
                  />
                </div>
              </div>

              {watched.config?.enableNotes && (
                <>
                  <div className={styles.group}>
                    <label className={styles.fieldLabel}>쪽지 도착</label>
                    <Controller
                      control={control}
                      name="config.noteDelivery"
                      render={({ field }) => (
                        <div className={styles.modeList}>
                          {NOTE_DELIVERY_OPTIONS.map((o) => (
                            <button
                              type="button"
                              key={o.value}
                              className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                              onClick={() => field.onChange(o.value)}
                            >
                              <strong>{o.label}</strong>
                              <span>{o.desc}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    />
                  </div>
                  <div className={styles.subField}>
                    <Input
                      type="number"
                      label="1인당 쪽지 수"
                      hint="한 사람이 보낼 쪽지를 제한해 신중한 선택을 유도해요 (1~20장)"
                      {...register('config.noteQuota', { valueAsNumber: true })}
                    />
                  </div>
                </>
              )}
            </div>

            {/* —— Sub-section C: 모집 성비 —— */}
            <div className={styles.section}>
              <div className={styles.groupHead}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.num}>C</span> 모집 성비
                </h3>
                <p className={styles.sectionNote}>
                  비워두면 성비 제한 없이 모집해요. 필요할 때만 세밀하게 잡아요.
                </p>
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>목표 성비</label>
                <Controller
                  control={control}
                  name="recruitment.genderRatioTarget"
                  render={({ field }) => (
                    <>
                      <div className={styles.chipRow}>
                        {RATIO_PRESETS.map((p) => (
                          <button
                            type="button"
                            key={p.value}
                            aria-pressed={field.value === p.value}
                            className={`${styles.ratioChip} ${field.value === p.value ? styles.ratioChipActive : ''}`}
                            onClick={() => field.onChange(p.value)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <Input
                        label="직접 입력 (남:여)"
                        hint="예) 5:3 · 상관없으면 any"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </>
                  )}
                />
              </div>

              <div className={styles.group}>
                <div className={styles.groupHead}>
                  <label className={styles.fieldLabel}>정원과 최소 인원 (선택)</label>
                  <p className={styles.fieldHelp}>성별 상한·하한을 따로 두고 싶을 때만 채워요.</p>
                </div>
                <div className={styles.fieldGroup}>
                  <Controller
                    control={control}
                    name="recruitment.maleCap"
                    render={({ field }) => (
                      <Input
                        type="number"
                        label="남성 정원 (선택)"
                        placeholder="제한 없음"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="recruitment.femaleCap"
                    render={({ field }) => (
                      <Input
                        type="number"
                        label="여성 정원 (선택)"
                        placeholder="제한 없음"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="recruitment.minMale"
                    render={({ field }) => (
                      <Input
                        type="number"
                        label="남성 최소 (선택)"
                        placeholder="제한 없음"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : Number(e.target.value))
                        }
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="recruitment.minFemale"
                    render={({ field }) => (
                      <Input
                        type="number"
                        label="여성 최소 (선택)"
                        placeholder="제한 없음"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value === '' ? null : Number(e.target.value))
                        }
                      />
                    )}
                  />
                </div>
              </div>

              <Controller
                control={control}
                name="recruitment.autoCancelAt"
                render={({ field }) => (
                  <div className={styles.subField}>
                    <Input
                      type="datetime-local"
                      label="자동 취소 마감 (선택)"
                      value={toLocalInput(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : new Date(e.target.value).toISOString(),
                        )
                      }
                    />
                    <p className={styles.helperLine}>
                      이 시각까지 최소 인원·성비를 못 채우면 파티가 자동으로 취소되고 전액 환불돼요.
                    </p>
                  </div>
                )}
              />
            </div>

            {/* —— Sub-section D: 참가 자격 —— */}
            <div className={styles.section}>
              <div className={styles.groupHead}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.num}>D</span> 참가 자격 (선택)
                </h3>
                <p className={styles.sectionNote}>
                  나이·혼인상태·아이 유무·인증을 조건으로 걸 수 있어요. 비우면 누구나 참가 가능해요.
                </p>
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>성별 나이 제한</label>
                <div className={styles.fieldGroup}>
                  <Input
                    type="number"
                    label="남성 최소"
                    placeholder="제한 없음"
                    {...register('maleAgeMin', { setValueAs: numOrNull })}
                  />
                  <Input
                    type="number"
                    label="남성 최대"
                    placeholder="제한 없음"
                    {...register('maleAgeMax', { setValueAs: numOrNull })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <Input
                    type="number"
                    label="여성 최소"
                    placeholder="제한 없음"
                    {...register('femaleAgeMin', { setValueAs: numOrNull })}
                  />
                  <Input
                    type="number"
                    label="여성 최대"
                    placeholder="제한 없음"
                    {...register('femaleAgeMax', { setValueAs: numOrNull })}
                  />
                </div>
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>혼인 상태 (복수 선택 · 비우면 무관)</label>
                <p className={styles.fieldHelp}>돌싱(이혼·사별)만 받는 모임 등에 사용해요.</p>
                <Controller
                  control={control}
                  name="maritalRequirement"
                  render={({ field }) => {
                    const val = field.value ?? []
                    return (
                      <div className={styles.chipRow}>
                        {MARITAL_REQ_OPTIONS.map((m) => {
                          const on = val.includes(m)
                          return (
                            <button
                              type="button"
                              key={m}
                              aria-pressed={on}
                              className={`${styles.ratioChip} ${on ? styles.ratioChipActive : ''}`}
                              onClick={() =>
                                field.onChange(on ? val.filter((x) => x !== m) : [...val, m])
                              }
                            >
                              {MARITAL_STATUS_LABEL[m]}
                            </button>
                          )
                        })}
                      </div>
                    )
                  }}
                />
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>아이 유무</label>
                <Controller
                  control={control}
                  name="childrenPolicy"
                  render={({ field }) => (
                    <div className={styles.chipRow}>
                      {CHILDREN_OPTS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          aria-pressed={(field.value ?? 'any') === c}
                          className={`${styles.ratioChip} ${(field.value ?? 'any') === c ? styles.ratioChipActive : ''}`}
                          onClick={() => field.onChange(c)}
                        >
                          {CHILDREN_POLICY_LABEL[c]}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              <div className={styles.group}>
                <label className={styles.fieldLabel}>필수 인증 (복수 선택)</label>
                <p className={styles.fieldHelp}>
                  본인·직업·재직·소득·미혼·학력 인증 중 선택한 항목을 검증한 사람만 참가할 수
                  있어요.
                </p>
                <Controller
                  control={control}
                  name="requiredVerifications"
                  render={({ field }) => {
                    const val = field.value ?? []
                    return (
                      <div className={styles.chipRow}>
                        {VERIFY_OPTIONS.map((v) => {
                          const on = val.includes(v)
                          return (
                            <button
                              type="button"
                              key={v}
                              aria-pressed={on}
                              className={`${styles.ratioChip} ${on ? styles.ratioChipActive : ''}`}
                              onClick={() =>
                                field.onChange(on ? val.filter((x) => x !== v) : [...val, v])
                              }
                            >
                              {VERIFICATION_FIELD_LABEL[v]}
                            </button>
                          )
                        })}
                      </div>
                    )
                  }}
                />
              </div>
            </div>
          </Card>
        )}

        {step === 'price' && (
          <Card padding="lg" className={styles.card}>
            <div className={styles.stepHead}>
              <h2 className={styles.h2}>참가비와 한 잔, 마지막으로 확인해요</h2>
              <p className={styles.sectionLead}>
                참가비와 환불 조건을 정하고, 음료·안주 제공 방식을 골라요.
              </p>
            </div>

            <div className={styles.group}>
              <label className={styles.fieldLabel}>참가비와 환불</label>
              <div className={styles.fieldGroup}>
                <Input
                  type="number"
                  label="참가비 (원)"
                  rightSlot={<span style={{ color: 'var(--color-text-subtle)' }}>KRW</span>}
                  {...register('pricing.basePriceKRW', { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  label="환불 마감 (시작 N시간 전)"
                  {...register('pricing.refundDeadlineHours', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className={styles.group}>
              <div className={styles.groupHead}>
                <label className={styles.fieldLabel}>성별·연령별 참가비 (선택)</label>
                <p className={styles.fieldHelp}>
                  예: 여성 30,000 · 남성 50,000, 또는 20~29세 30,000. 먼저 맞는 규칙이 적용돼요.
                </p>
              </div>
              {priceRules.fields.map((f, i) => (
                <div key={f.id} className={styles.fieldGroup}>
                  <select
                    className={styles.select}
                    aria-label={`가격 규칙 ${i + 1} 적용 성별`}
                    {...register(`pricing.pricingRules.${i}.gender`, {
                      setValueAs: (v) => (v === '' ? null : v),
                    })}
                  >
                    <option value="">전체</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                  <Input
                    type="number"
                    label="최소나이"
                    placeholder="-"
                    {...register(`pricing.pricingRules.${i}.ageMin`, { setValueAs: numOrNull })}
                  />
                  <Input
                    type="number"
                    label="최대나이"
                    placeholder="-"
                    {...register(`pricing.pricingRules.${i}.ageMax`, { setValueAs: numOrNull })}
                  />
                  <Input
                    type="number"
                    label="가격"
                    {...register(`pricing.pricingRules.${i}.priceKRW`, { valueAsNumber: true })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => priceRules.remove(i)}
                  >
                    삭제
                  </Button>
                </div>
              ))}
              <Button
                variant="soft"
                size="sm"
                type="button"
                onClick={() =>
                  priceRules.append({ gender: null, ageMin: null, ageMax: null, priceKRW: 30000 })
                }
              >
                + 가격 규칙 추가
              </Button>
            </div>

            <div className={styles.group}>
              <label className={styles.fieldLabel}>음료 제공 방식</label>
              <Controller
                control={control}
                name="pricing.drinkPackage"
                render={({ field }) => (
                  <div className={styles.modeList}>
                    {(
                      [
                        { value: 'none', label: '없음', desc: '음료 제공 안 함' },
                        {
                          value: 'per-glass',
                          label: '잔당 결제',
                          desc: '메뉴에서 골라서 추가 주문',
                        },
                        {
                          value: 'unlimited',
                          label: '무제한',
                          desc: '시간 내 리필 자유, 추가 비용 없음',
                        },
                        {
                          value: 'paired',
                          label: '페어링 코스',
                          desc: '라운드마다 호스트가 한 잔씩',
                        },
                      ] as const
                    ).map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                        onClick={() => field.onChange(o.value)}
                      >
                        <strong>{o.label}</strong>
                        <span>{o.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className={styles.group}>
              <label className={styles.fieldLabel}>안주/디저트 제공 방식</label>
              <Controller
                control={control}
                name="pricing.snackPackage"
                render={({ field }) => (
                  <div className={styles.modeList}>
                    {(
                      [
                        { value: 'none', label: '없음', desc: '안주 제공 안 함' },
                        { value: 'per-plate', label: '접시당 결제', desc: '메뉴에서 추가 주문' },
                        {
                          value: 'course',
                          label: '셰프 코스',
                          desc: '정해진 시점에 코스로 제공',
                        },
                        {
                          value: 'pairing-bites',
                          label: '페어링 바이트',
                          desc: '음료에 맞춘 소량 페어링',
                        },
                      ] as const
                    ).map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                        onClick={() => field.onChange(o.value)}
                      >
                        <strong>{o.label}</strong>
                        <span>{o.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryHead}>
                <span className={styles.summaryKicker}>FINAL CHECK</span>
                <h3 className={styles.h3}>이렇게 열려요</h3>
              </div>
              <Summary watched={watched} />
            </div>
            <p className={styles.inviteHint}>
              💌 개설 후 친구 초대 코드가 발급돼요. 카톡 한 번에 보낼 수 있어요.
            </p>
          </Card>
        )}

        <div className={`${styles.actions} ${prev[step] ? '' : styles.actionsSolo}`}>
          {prev[step] && (
            <Button
              variant="ghost"
              size="lg"
              type="button"
              leftIcon="←"
              onClick={() => setStep(prev[step]!)}
            >
              이전
            </Button>
          )}
          {next[step] ? (
            <Button
              variant="primary"
              size="lg"
              type="button"
              rightIcon="→"
              onClick={() => setStep(next[step]!)}
            >
              다음
            </Button>
          ) : (
            <Button
              variant="gold"
              size="lg"
              type="submit"
              className={styles.submit}
              leftIcon="✨"
              isLoading={create.isPending}
            >
              파티 열기
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

const STEP_LABEL = {
  concept: '컨셉',
  venue: '장소',
  rounds: '라운드',
  match: '매칭 & 대화',
  price: '가격',
} as const

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked?: boolean
  onChange: (v: boolean) => void
  label: string
  desc?: string
}) {
  return (
    <label className={styles.toggle}>
      <div>
        <strong>{label}</strong>
        {desc && <p>{desc}</p>}
      </div>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.toggleSlider} />
    </label>
  )
}

function Summary({ watched }: { watched: Partial<CreatePartyDto> }) {
  const cat = watched.config?.category ? CATEGORY_META[watched.config.category] : null
  return (
    <ul className={styles.summaryList}>
      <li>
        <span>카테고리</span>
        <strong>
          {cat?.emoji} {cat?.label ?? '-'}
        </strong>
      </li>
      <li>
        <span>제목</span>
        <strong>{watched.title || '-'}</strong>
      </li>
      <li>
        <span>대화 구조</span>
        <strong>
          {watched.config?.rotationFormat
            ? ROTATION_FORMAT_LABEL[watched.config.rotationFormat]
            : '-'}
        </strong>
      </li>
      <li>
        <span>라운드</span>
        <strong>
          {watched.config?.totalRounds ?? '-'} ×{' '}
          {Math.round((watched.config?.roundDurationSec ?? 0) / 60)}분
        </strong>
      </li>
      <li>
        <span>정원</span>
        <strong>
          {watched.minParticipants ?? '-'} ~ {watched.maxParticipants ?? '-'} 명
        </strong>
      </li>
      <li>
        <span>성비</span>
        <strong>{watched.recruitment?.genderRatioTarget ?? '-'}</strong>
      </li>
      <li className={styles.summaryPrice}>
        <span>참가비</span>
        <strong>{(watched.pricing?.basePriceKRW ?? 0).toLocaleString()}원</strong>
      </li>
    </ul>
  )
}
