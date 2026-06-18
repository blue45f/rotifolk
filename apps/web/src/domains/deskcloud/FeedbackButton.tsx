/**
 * 피드백(Feedback) — SurveyDesk 네이티브 연동.
 * ──────────────────────────────────────────────────────────────────────────
 * `@heejun/deskcloud` 의 createSurveyClient(pk_) 로 활성 설문을 받아
 * 앱의 Sheet + Button + Input + 디자인 토큰으로 렌더한다(외부 위젯 CSS·번들 없음).
 *
 * 우하단 고정 런처로 마운트되며, VITE_SURVEYDESK_URL 미설정 시 렌더되지 않는다.
 * 미설정 환경에서는 앱의 1차 고객지원 플로우(/support, TermsDesk 문의)가 그대로 유지된다.
 */
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { useCallback, useEffect, useMemo, useState } from 'react'

import styles from './FeedbackButton.module.css'

import type { Survey, SurveyAnswerValue, SurveyQuestion } from '@heejun/deskcloud'

import { getSurveyDesk } from '@/domains/deskcloud/clients'

const RATING_MAX = 5
const NPS_MAX = 10

type Phase = 'idle' | 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'no-survey'
type Answers = Record<string, SurveyAnswerValue | undefined>

function isEmpty(v: SurveyAnswerValue | undefined): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim().length === 0
  if (Array.isArray(v)) return v.length === 0
  return false
}

function StarField({
  labelId,
  value,
  onChange,
}: {
  labelId: string
  value: SurveyAnswerValue | undefined
  onChange: (v: SurveyAnswerValue | undefined) => void
}) {
  const current = typeof value === 'number' ? value : 0
  return (
    <div className={styles.stars} role="radiogroup" aria-labelledby={labelId}>
      {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((n) => {
        const on = n <= current
        return (
          <button
            key={n}
            type="button"
            className={on ? styles.starOn : styles.starOff}
            role="radio"
            aria-checked={current === n}
            aria-label={`${n}점`}
            tabIndex={current === n || (current === 0 && n === 1) ? 0 : -1}
            onClick={() => onChange(current === n ? undefined : n)}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

function NpsField({
  labelId,
  value,
  onChange,
}: {
  labelId: string
  value: SurveyAnswerValue | undefined
  onChange: (v: SurveyAnswerValue | undefined) => void
}) {
  const current = typeof value === 'number' ? value : null
  return (
    <div>
      <div className={styles.nps} role="group" aria-labelledby={labelId}>
        {Array.from({ length: NPS_MAX + 1 }, (_, n) => (
          <button
            key={n}
            type="button"
            className={styles.npsBtn}
            aria-pressed={current === n}
            aria-label={`${n}점`}
            onClick={() => onChange(current === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className={styles.npsLegend} aria-hidden="true">
        <span>전혀 아니다</span>
        <span>매우 그렇다</span>
      </div>
    </div>
  )
}

function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: SurveyQuestion
  value: SurveyAnswerValue | undefined
  error?: string
  onChange: (v: SurveyAnswerValue | undefined) => void
}) {
  const labelId = `fb-q-${question.id}`
  const errorId = `fb-e-${question.id}`
  const text = typeof value === 'string' ? value : ''
  const selected = Array.isArray(value) ? value : []

  return (
    <div className={styles.field} role="group" aria-labelledby={labelId}>
      <span className={styles.label} id={labelId}>
        {question.label}
        {question.required ? (
          <span className={styles.req} aria-hidden="true">
            *
          </span>
        ) : null}
      </span>

      {question.type === 'rating' ? (
        <StarField labelId={labelId} value={value} onChange={onChange} />
      ) : null}

      {question.type === 'nps' ? (
        <NpsField labelId={labelId} value={value} onChange={onChange} />
      ) : null}

      {question.type === 'single_choice' ? (
        <div className={styles.choices} role="radiogroup" aria-labelledby={labelId}>
          {(question.options ?? []).map((opt) => (
            <label key={opt.value} className={styles.choice}>
              <input
                type="radio"
                name={labelId}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {question.type === 'multi_choice' ? (
        <div className={styles.choices} role="group" aria-labelledby={labelId}>
          {(question.options ?? []).map((opt) => {
            const checked = selected.includes(opt.value)
            return (
              <label key={opt.value} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value]
                    onChange(next.length > 0 ? next : undefined)
                  }}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      ) : null}

      {question.type === 'text' && question.variant === 'long' ? (
        <textarea
          className={styles.textarea}
          value={text}
          maxLength={4000}
          placeholder="자유롭게 적어 주세요"
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value.length > 0 ? e.target.value : undefined)}
        />
      ) : null}

      {question.type === 'text' && question.variant !== 'long' ? (
        <Input
          value={text}
          maxLength={280}
          placeholder="한 줄로 적어 주세요"
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value.length > 0 ? e.target.value : undefined)}
        />
      ) : null}

      {error ? (
        <p className={styles.fieldError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function FeedbackButton() {
  // 클라이언트 생성을 렌더 시점에 결정 — env 미설정이면 effect 없이 즉시 null 반환.
  const config = useMemo(() => getSurveyDesk('rotifolk'), [])
  const [open, setOpen] = useState(false)
  // 초기값 'loading' — 첫 설문 확인은 effect 의 async 콜백에서만 상태를 바꾼다.
  const [phase, setPhase] = useState<Phase>('loading')
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // 마운트 시 활성 설문 존재 여부 확인(없거나 404 면 런처를 그리지 않음).
  useEffect(() => {
    if (!config) return
    const ctrl = new AbortController()
    config.client
      .getActive(config.appId)
      .then((s) => {
        if (ctrl.signal.aborted) return
        setSurvey(s)
        setPhase('ready')
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        // 404 = 활성 설문 없음 → 런처를 숨긴다(노이즈 방지).
        const status = (e as { status?: number })?.status
        setPhase(status === 404 ? 'no-survey' : 'error')
      })
    return () => ctrl.abort()
  }, [config])

  const setAnswer = useCallback((qid: string, v: SurveyAnswerValue | undefined) => {
    setAnswers((prev) => ({ ...prev, [qid]: v }))
    setErrors((prev) => {
      if (!prev[qid]) return prev
      const next = { ...prev }
      delete next[qid]
      return next
    })
  }, [])

  const submit = useCallback(() => {
    if (!config || !survey) return
    const map: Record<string, string> = {}
    const cleaned: Record<string, SurveyAnswerValue> = {}
    for (const q of survey.questions) {
      const raw = answers[q.id]
      if (isEmpty(raw)) {
        if (q.required) map[q.id] = '필수 항목입니다.'
        continue
      }
      cleaned[q.id] = raw as SurveyAnswerValue
    }
    if (Object.keys(map).length > 0) {
      setErrors(map)
      setFormError('입력을 확인해 주세요.')
      return
    }
    setPhase('submitting')
    setFormError(null)
    config.client
      .submit(config.appId, {
        answers: cleaned,
        meta: {
          pageUrl: typeof location !== 'undefined' ? location.href : undefined,
          referrer:
            typeof document !== 'undefined' && document.referrer ? document.referrer : undefined,
        },
      })
      .then(() => setPhase('success'))
      .catch((e: unknown) => {
        setPhase('ready')
        setFormError(e instanceof Error ? e.message : '제출에 실패했어요.')
      })
  }, [config, survey, answers])

  const closeSheet = useCallback(() => {
    setOpen(false)
    if (phase === 'success') {
      setAnswers({})
      setErrors({})
      setPhase(survey ? 'ready' : 'idle')
    }
  }, [phase, survey])

  // env 미설정이거나 활성 설문이 없으면 아무것도 렌더하지 않는다.
  if (!config || phase === 'no-survey') return null
  // 첫 로드(설문 확인) 중에는 런처를 미리 그리지 않는다(깜빡임 방지) — 단, 오류는 노출.
  if (phase === 'loading' && !survey) return null
  if (phase === 'error' && !survey) return null

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Icon name="chat" aria-hidden />
        <span>피드백</span>
      </button>

      <Sheet
        open={open}
        onClose={closeSheet}
        title={survey?.title ?? '피드백'}
        description={survey?.intro ?? undefined}
        size="md"
        footer={
          phase === 'success' ? undefined : (
            <div className={styles.footer}>
              <Button variant="ghost" onClick={closeSheet}>
                취소
              </Button>
              <Button
                variant="primary"
                isLoading={phase === 'submitting'}
                onClick={submit}
                leftIcon={<Icon name="check" />}
              >
                제출
              </Button>
            </div>
          )
        }
      >
        {phase === 'success' ? (
          <div className={styles.state} role="status">
            <span className={styles.successMark} aria-hidden="true">
              <Icon name="check" size={1.6} />
            </span>
            <p className={styles.stateTitle}>소중한 의견 감사합니다</p>
            <p>보내 주신 피드백은 서비스 개선에 활용할게요.</p>
            <div className={styles.stateAction}>
              <Button variant="soft" onClick={closeSheet}>
                닫기
              </Button>
            </div>
          </div>
        ) : null}

        {phase !== 'success' && survey ? (
          <form
            className={styles.form}
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {formError ? (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            ) : null}
            {survey.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={answers[q.id]}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
            <button
              type="submit"
              className={styles.hiddenSubmit}
              tabIndex={-1}
              aria-hidden="true"
            />
          </form>
        ) : null}
      </Sheet>
    </>
  )
}

export default FeedbackButton
