import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { ALL_CATEGORIES } from '@features/categories/meta'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './HostApply.module.css'

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

interface HostApplication {
  id: string
  userId: string
  introduction: string
  hostingStyle: string
  plannedCategories: string[]
  experience: string | null
  status: ApplicationStatus
  reviewedById: string | null
  reviewedNote: string | null
  createdAt: string
  updatedAt: string
}

interface CreateApplicationPayload {
  introduction: string
  hostingStyle: string
  plannedCategories: string[]
  experience?: string
}

const HOSTING_STYLES = [
  { value: '차분', emoji: '🌙', desc: '담담하게 흐르듯' },
  { value: '따뜻', emoji: '☕️', desc: '환대로 시작하는' },
  { value: '진지', emoji: '📖', desc: '깊은 대화를 위한' },
  { value: '발랄', emoji: '✨', desc: '경쾌하고 즐거운' },
] as const

/** 호스트 인증 신청 폼 검증 — 소개 50자 이상, 진행 스타일·카테고리 필수, 경험은 선택. */
const HostApplyFormSchema = z.object({
  introduction: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(50, '50자 이상 적어주세요.')),
  hostingStyle: z.string().min(1, '진행 스타일을 선택해 주세요.'),
  plannedCategories: z.array(z.string()).min(1, '카테고리를 한 개 이상 골라주세요.'),
  experience: z.string(),
})
type HostApplyFormValues = z.infer<typeof HostApplyFormSchema>

const HOST_APPLY_DEFAULTS: HostApplyFormValues = {
  introduction: '',
  hostingStyle: '',
  plannedCategories: [],
  experience: '',
}

const myApplicationKey = ['host-application', 'mine'] as const

function useMyApp() {
  return useQuery({
    queryKey: myApplicationKey,
    queryFn: () => api.get<HostApplication | null>('host-applications/mine'),
  })
}

export default function HostApplyPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)
  const user = useAuthStore((s) => s.user)
  const { data: application, isLoading } = useMyApp()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<HostApplyFormValues>({
    resolver: zodResolver(HostApplyFormSchema),
    defaultValues: HOST_APPLY_DEFAULTS,
    mode: 'onSubmit',
  })

  const introduction = watch('introduction')
  const hostingStyle = watch('hostingStyle')
  const plannedCategories = watch('plannedCategories')
  const introLen = introduction.trim().length

  const create = useMutation({
    mutationFn: (payload: CreateApplicationPayload) =>
      api.post<HostApplication>('host-applications', payload),
    onSuccess: (created) => {
      queryClient.setQueryData(myApplicationKey, created)
      toast.show('호스트 인증 신청이 접수됐어요. 1~2일 안에 검토할게요.', 'success')
      reset(HOST_APPLY_DEFAULTS)
    },
    onError: (err: Error) => {
      toast.show(err.message ?? '신청을 보내는 중 문제가 생겼어요.', 'error')
    },
  })

  const validationHints = useMemo(() => {
    const hints: string[] = []
    if (introLen < 50) hints.push(`소개를 ${50 - introLen}자 더 적어주세요`)
    if (!hostingStyle) hints.push('진행 스타일을 골라주세요')
    if (plannedCategories.length === 0) hints.push('진행할 카테고리를 한 개 이상 선택해 주세요')
    return hints
  }, [introLen, hostingStyle, plannedCategories.length])

  const onSubmit = handleSubmit((data) => {
    create.mutate({
      introduction: data.introduction.trim(),
      hostingStyle: data.hostingStyle,
      plannedCategories: data.plannedCategories,
      experience: data.experience.trim() || undefined,
    })
  })

  const handleReapply = () => {
    queryClient.setQueryData(myApplicationKey, null)
  }

  const renderStatusCard = () => {
    if (!application) return null
    if (application.status === 'approved') {
      const isAlreadyHost = user?.role === 'host' || user?.role === 'admin'
      if (!isAlreadyHost) {
        updateUser({ role: 'host', isVerified: true })
      }
      return (
        <Card padding="lg" variant="gradient" className={styles.statusCard}>
          <div className={styles.statusHead}>
            <span className={styles.statusEmoji} aria-hidden="true">
              ✅
            </span>
            <div>
              <h2 className={styles.statusTitle}>인증된 호스트입니다</h2>
              <p className={styles.statusLead}>
                {user?.nickname ?? '회원'}님은 이제 모임을 직접 열고 라운드를 운영할 수 있어요.
              </p>
            </div>
          </div>
          {application.reviewedNote && (
            <p className={styles.reviewerNote}>“{application.reviewedNote}”</p>
          )}
          <div className={styles.statusActions}>
            <Link to="/host">
              <Button variant="primary" size="lg">
                호스트 콘솔 열기
              </Button>
            </Link>
            <Link to="/host/create">
              <Button variant="ghost" size="lg">
                새 파티 만들기
              </Button>
            </Link>
          </div>
        </Card>
      )
    }

    if (application.status === 'pending') {
      return (
        <Card padding="lg" variant="soft" className={styles.statusCard}>
          <div className={styles.statusHead}>
            <span className={styles.statusEmoji} aria-hidden="true">
              🕰️
            </span>
            <div>
              <h2 className={styles.statusTitle}>검토 중이에요</h2>
              <p className={styles.statusLead}>
                보통 1~2일 안에 검토 결과를 알려드려요. 알림을 받으실 수 있도록 알림 권한을 켜
                두시면 좋아요.
              </p>
            </div>
          </div>
          <dl className={styles.summaryList}>
            <div>
              <dt>진행 스타일</dt>
              <dd>{application.hostingStyle}</dd>
            </div>
            <div>
              <dt>예정 카테고리</dt>
              <dd>{application.plannedCategories.join(' · ')}</dd>
            </div>
            <div>
              <dt>접수일</dt>
              <dd>{new Date(application.createdAt).toLocaleDateString('ko-KR')}</dd>
            </div>
          </dl>
        </Card>
      )
    }

    return (
      <Card padding="lg" className={styles.statusCard}>
        <div className={styles.statusHead}>
          <span className={styles.statusEmoji} aria-hidden="true">
            🤍
          </span>
          <div>
            <h2 className={styles.statusTitle}>이번엔 인증이 보류됐어요</h2>
            <p className={styles.statusLead}>
              아래 메모를 참고해 보완한 뒤 다시 신청해 주세요. 한 사람의 작은 모임도 우리에겐
              소중해요.
            </p>
          </div>
        </div>
        {application.reviewedNote ? (
          <p className={styles.reviewerNote}>“{application.reviewedNote}”</p>
        ) : (
          <p className={styles.reviewerNote}>
            구체적인 사유가 도착하지 않았어요. 소개를 조금 더 구체적으로 작성해 주시면 통과 확률이
            높아져요.
          </p>
        )}
        <div className={styles.statusActions}>
          <Button variant="primary" size="lg" onClick={handleReapply}>
            다시 신청하기
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <Badge tone="primary" size="md" outlined>
          호스트 인증
        </Badge>
        <h1 className={styles.title}>더 많은 사람을 잇고 싶다면</h1>
        <p className={styles.lead}>
          짧은 자기소개로 시작해요. 어떤 라운드를 그리고 있는지, 어떤 분위기로 진행할지 알려주시면
          1~2일 내로 인증해 드릴게요. 인증되면 모든 카테고리의 모임을 직접 열 수 있어요.
        </p>
      </header>

      {isLoading ? (
        <div className={`container ${styles.body}`}>
          <Loading />
        </div>
      ) : application ? (
        <section className={`container ${styles.body}`}>{renderStatusCard()}</section>
      ) : (
        <form className={`container ${styles.body}`} onSubmit={onSubmit} noValidate>
          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>1. 어떤 호스트가 되고 싶나요?</h2>
            <p className={styles.sectionLead}>
              호스트 페르소나를 그릴 수 있도록 자유롭게 적어주세요. 최소 50자.
            </p>
            <div className={styles.field}>
              <label htmlFor="introduction" className={styles.fieldLabel}>
                소개
              </label>
              <textarea
                id="introduction"
                className={styles.textarea}
                rows={6}
                placeholder="예) 평일 저녁 한남동에서 와인을 따르는 게 가장 좋은 시간이에요. 처음 만난 사람도 한 잔 두 잔 부딪치다 보면 결국 자기 이야기를 꺼내게 되는데, 그 순간을 가장 좋아합니다."
                aria-describedby="intro-counter"
                aria-invalid={isSubmitted && introLen < 50}
                {...register('introduction')}
              />
              <div className={styles.fieldFoot} id="intro-counter">
                <span className={introLen < 50 ? styles.counterPending : styles.counterDone}>
                  {introLen} / 50자
                </span>
                {isSubmitted && introLen < 50 && (
                  <span className={styles.fieldError}>50자 이상 적어주세요.</span>
                )}
              </div>
            </div>
          </Card>

          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>2. 진행 스타일</h2>
            <p className={styles.sectionLead}>가장 가까운 스타일 하나를 골라주세요.</p>
            <Controller
              control={control}
              name="hostingStyle"
              render={({ field }) => (
                <div
                  className={styles.styleGrid}
                  role="radiogroup"
                  aria-label="진행 스타일"
                  aria-invalid={isSubmitted && !field.value}
                >
                  {HOSTING_STYLES.map((s) => {
                    const active = field.value === s.value
                    return (
                      <button
                        type="button"
                        key={s.value}
                        role="radio"
                        aria-checked={active}
                        className={`${styles.styleBtn} ${active ? styles.styleActive : ''}`}
                        onClick={() => field.onChange(s.value)}
                      >
                        <span className={styles.styleEmoji} aria-hidden="true">
                          {s.emoji}
                        </span>
                        <strong>{s.value}</strong>
                        <span className={styles.styleDesc}>{s.desc}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {isSubmitted && errors.hostingStyle && (
              <p className={styles.fieldError}>{errors.hostingStyle.message}</p>
            )}
          </Card>

          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>3. 진행하고 싶은 카테고리</h2>
            <p className={styles.sectionLead}>
              여러 개를 골라도 좋아요. 첫 모임은 가장 자신 있는 한두 가지부터 추천드려요.
            </p>
            <Controller
              control={control}
              name="plannedCategories"
              render={({ field }) => (
                <div className={styles.chipRow}>
                  {ALL_CATEGORIES.map((c) => {
                    const selected = field.value.includes(c.value)
                    return (
                      <Chip
                        key={c.value}
                        leadingEmoji={c.emoji}
                        selected={selected}
                        onClick={() =>
                          field.onChange(
                            selected
                              ? field.value.filter((x) => x !== c.value)
                              : [...field.value, c.value],
                          )
                        }
                      >
                        {c.shortLabel}
                      </Chip>
                    )
                  })}
                </div>
              )}
            />
            {isSubmitted && errors.plannedCategories && (
              <p className={styles.fieldError}>{errors.plannedCategories.message}</p>
            )}
          </Card>

          <Card padding="lg" className={styles.card}>
            <h2 className={styles.h2}>
              4. 진행 경험 <span className={styles.optional}>(선택)</span>
            </h2>
            <p className={styles.sectionLead}>
              모임/스터디/북클럽/팝업 등 사람을 모아본 경험이 있다면 자유롭게 적어주세요.
            </p>
            <div className={styles.field}>
              <label htmlFor="experience" className={styles.fieldLabel}>
                경험
              </label>
              <textarea
                id="experience"
                className={styles.textarea}
                rows={4}
                placeholder="예) 분기마다 8명 규모 와인 살롱을 6회 진행했어요. 한 라운드는 약 30분, 페어링 한 잔에 한 주제로."
                {...register('experience')}
              />
            </div>
          </Card>

          {isSubmitted && validationHints.length > 0 && (
            <div className={styles.hintBox} role="status" aria-live="polite">
              <strong>아직 한 걸음 남았어요</strong>
              <ul>
                {validationHints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.actions}>
            <p className={styles.smallNote}>
              제출 후에는 본인의 자기소개 페이지에도 동일하게 반영됩니다.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={create.isPending}
              disabled={create.isPending}
            >
              호스트 인증 신청 보내기
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
