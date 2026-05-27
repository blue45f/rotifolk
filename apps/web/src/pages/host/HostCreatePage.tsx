import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import type { CreatePartyDto } from '@rotifolk/shared'
import { CreatePartySchema } from '@rotifolk/shared'
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
  },
  pricing: {
    basePriceKRW: 36000,
    drinkPackage: 'per-glass',
    snackPackage: 'none',
    refundDeadlineHours: 24,
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
  const [step, setStep] = useState<'concept' | 'venue' | 'rounds' | 'price'>('concept')

  const next: Record<typeof step, typeof step | null> = {
    concept: 'venue',
    venue: 'rounds',
    rounds: 'price',
    price: null,
  }
  const prev: Record<typeof step, typeof step | null> = {
    concept: null,
    venue: 'concept',
    rounds: 'venue',
    price: 'rounds',
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
          {(['concept', 'venue', 'rounds', 'price'] as const).map((s, i) => (
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
                          {v.partnered && <Badge tone="gold" size="sm">제휴</Badge>}
                        </div>
                        <div className={styles.venueMeta}>
                          📍 {v.area} · 최대 {v.capacity}명 · 시간당 {v.pricePerHourKRW.toLocaleString()}원
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

        {step === 'price' && (
          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>4. 가격 & 환불</h2>
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
                  {([
                    { value: 'none', label: '없음', desc: '음료 제공 안 함' },
                    { value: 'per-glass', label: '잔당 결제', desc: '메뉴에서 골라서 추가 주문' },
                    { value: 'unlimited', label: '무제한', desc: '시간 내 리필 자유, 추가 비용 없음' },
                    { value: 'paired', label: '페어링 코스', desc: '라운드마다 호스트가 한 잔씩' },
                  ] as const).map((o) => (
                    <button type="button" key={o.value}
                      className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                      onClick={() => field.onChange(o.value)}>
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
                  {([
                    { value: 'none', label: '없음', desc: '안주 제공 안 함' },
                    { value: 'per-plate', label: '접시당 결제', desc: '메뉴에서 추가 주문' },
                    { value: 'course', label: '셰프 코스', desc: '정해진 시점에 코스로 제공' },
                    { value: 'pairing-bites', label: '페어링 바이트', desc: '음료에 맞춘 소량 페어링' },
                  ] as const).map((o) => (
                    <button type="button" key={o.value}
                      className={`${styles.modeBtn} ${field.value === o.value ? styles.modeActive : ''}`}
                      onClick={() => field.onChange(o.value)}>
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

const STEP_LABEL = { concept: '컨셉', venue: '장소', rounds: '라운드', price: '가격' } as const

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
        <span>라운드</span>
        <strong>
          {watched.config?.totalRounds ?? '-'} × {Math.round((watched.config?.roundDurationSec ?? 0) / 60)}
          분
        </strong>
      </li>
      <li>
        <span>정원</span>
        <strong>
          {watched.minParticipants ?? '-'} ~ {watched.maxParticipants ?? '-'} 명
        </strong>
      </li>
      <li>
        <span>참가비</span>
        <strong>{(watched.pricing?.basePriceKRW ?? 0).toLocaleString()}원</strong>
      </li>
    </ul>
  )
}
