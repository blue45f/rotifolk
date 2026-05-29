import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import type {
  CreatePartyDto,
  PartyFormat,
  RotationFormat,
  MatchScope,
  ConnectionMode,
  NoteDelivery,
} from '@rotifolk/shared'
import { CreatePartySchema, PARTY_FORMAT_LABEL, ROTATION_FORMAT_LABEL } from '@rotifolk/shared'
import { useCreateParty } from '@features/parties/queries'
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
    connectionMode: 'chat',
    groupAfterParty: false,
    enableNotes: true,
    noteDelivery: 'party-end',
    enableConversationKit: true,
  },
  pricing: {
    basePriceKRW: 36000,
    drinkPackage: 'per-glass',
    snackPackage: 'none',
    refundDeadlineHours: 24,
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
  { value: 'all-participants', label: '전원 연결', desc: '참가자 모두를 연결' },
]

const CONNECTION_OPTIONS: { value: ConnectionMode; label: string; desc: string }[] = [
  { value: 'chat', label: '채팅', desc: '앱 안에서 메시지로 대화' },
  { value: 'phone', label: '전화', desc: '연락처를 교환해 직접 연결' },
  { value: 'both', label: '둘 다', desc: '채팅과 연락처 모두 열어둬요' },
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePartyDto>({
    resolver: zodResolver(CreatePartySchema) as never,
    defaultValues: DEFAULTS as never,
  })

  const watched = watch()
  const [step, setStep] = useState<'concept' | 'venue' | 'rounds' | 'match' | 'price'>('concept')

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
      toast.show('파티가 열렸어요! ✨', 'success')
      navigate(`/host/parties/${created.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  })

  return (
    <form onSubmit={onSubmit} className={styles.page}>
      <header className={`container ${styles.head}`}>
        <h1 className={styles.title}>새 로테이션 파티 만들기</h1>
        <div className={styles.stepper} role="tablist" aria-label="파티 개설 단계">
          {(['concept', 'venue', 'rounds', 'match', 'price'] as const).map((s, i) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={step === s}
              className={`${styles.stepItem} ${step === s ? styles.stepActive : ''}`}
              onClick={() => setStep(s)}
            >
              <span className={styles.stepDot}>{i + 1}</span>
              <span>{STEP_LABEL[s]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className={`container ${styles.body}`}>
        {step === 'concept' && (
          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>1. 어떤 모임인가요?</h2>

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
                        background: field.value === c.value ? c.bgGradient : 'var(--color-surface)',
                        color: field.value === c.value ? '#FCFAF5' : 'var(--color-text)',
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
            <h2 className={styles.h2}>2. 장소 섭외</h2>
            <p className={styles.sectionLead}>
              제휴 라운지/와인바/카페에서 고르거나, 직접 입력한 장소도 사용할 수 있어요.
            </p>

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

            <div className={styles.fieldGroup}>
              <div className={styles.dateRow}>
                <Input
                  type="datetime-local"
                  label="시작 시각"
                  onChange={(e) => setValue('startAt', new Date(e.target.value).toISOString())}
                />
                <Input
                  type="datetime-local"
                  label="종료 시각"
                  onChange={(e) => setValue('endAt', new Date(e.target.value).toISOString())}
                />
              </div>
            </div>
          </Card>
        )}

        {step === 'rounds' && (
          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>3. 라운드 구성</h2>

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

            <h3 className={styles.h3}>옵션</h3>
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
          </Card>
        )}

        {step === 'match' && (
          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>4. 매칭 & 대화</h2>
            <p className={styles.sectionLead}>
              어떤 방식으로 만나고 어떻게 연결될지, 그리고 모집 성비를 여기서 정해요.
            </p>

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
            {watched.config?.matchScope === 'top-n' && (
              <div className={styles.subField}>
                <Input
                  type="number"
                  label="연결할 인원 수 (N)"
                  hint="한 사람당 최대 몇 명까지 연결할지 (1~20명)"
                  {...register('config.maxMatchesPerPerson', { valueAsNumber: true })}
                />
              </div>
            )}

            <label className={styles.fieldLabel}>연결 매체</label>
            <Controller
              control={control}
              name="config.connectionMode"
              render={({ field }) => (
                <div className={styles.modeList}>
                  {CONNECTION_OPTIONS.map((o) => (
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

            <h3 className={styles.h3}>대화 옵션</h3>
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
            </div>

            {watched.config?.enableNotes && (
              <>
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
              </>
            )}

            <h3 className={styles.h3}>성비 맞추기</h3>
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
          </Card>
        )}

        {step === 'price' && (
          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>5. 가격 & 환불</h2>
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
            <label className={styles.fieldLabel}>음료 제공 방식</label>
            <Controller
              control={control}
              name="pricing.drinkPackage"
              render={({ field }) => (
                <div className={styles.modeList}>
                  {(
                    [
                      { value: 'none', label: '없음', desc: '음료 제공 안 함' },
                      { value: 'per-glass', label: '잔당 결제', desc: '메뉴에서 골라서 추가 주문' },
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
                      { value: 'course', label: '셰프 코스', desc: '정해진 시점에 코스로 제공' },
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

            <div className={styles.summary}>
              <h3 className={styles.h3}>최종 요약</h3>
              <Summary watched={watched} />
            </div>
            <p className={styles.inviteHint}>
              💌 개설 후 친구 초대 코드가 발급돼요. 카톡 한 번에 보낼 수 있어요.
            </p>
          </Card>
        )}

        <div className={styles.actions}>
          {prev[step] && (
            <Button variant="ghost" size="lg" type="button" onClick={() => setStep(prev[step]!)}>
              ← 이전
            </Button>
          )}
          {next[step] ? (
            <Button variant="primary" size="lg" type="button" onClick={() => setStep(next[step]!)}>
              다음 →
            </Button>
          ) : (
            <Button variant="gold" size="lg" type="submit" isLoading={create.isPending}>
              ✨ 파티 열기
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
      <li>
        <span>참가비</span>
        <strong>{(watched.pricing?.basePriceKRW ?? 0).toLocaleString()}원</strong>
      </li>
    </ul>
  )
}
