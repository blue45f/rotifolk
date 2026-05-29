import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { SignUpSchema } from '@rotifolk/shared'
import type { SignUpDto } from '@rotifolk/shared'
import { useSignUp } from '@features/auth/queries'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './AuthPage.module.css'

type StrengthLevel = 'weak' | 'medium' | 'strong'

function passwordStrength(pw: string): { level: StrengthLevel; label: string } | null {
  if (!pw) return null
  const hasNum = /\d/.test(pw)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw)
  const long = pw.length >= 12
  if (pw.length < 8) return { level: 'weak', label: '너무 짧아요' }
  if (hasNum && hasSpecial && long) return { level: 'strong', label: '안전해요' }
  if (hasNum || hasSpecial) return { level: 'medium', label: '조금 더 강하게' }
  return { level: 'weak', label: '숫자나 특수문자를 추가해 보세요' }
}

export default function SignUpPage() {
  const signUp = useSignUp()
  const navigate = useNavigate()
  const toast = useToast()
  const [referralCode, setReferralCode] = useState('')
  const [pwValue, setPwValue] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [agreeError, setAgreeError] = useState(false)

  const strength = passwordStrength(pwValue)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpDto>({ resolver: zodResolver(SignUpSchema) })

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />
      <Card padding="lg" variant="glass" className={styles.card}>
        <h1 className={styles.title}>5분 라운드, 시작해 볼까요</h1>
        <p className={styles.lead}>닉네임과 이메일이면 충분해요.</p>
        <form
          className={styles.form}
          onSubmit={handleSubmit(async (data) => {
            if (!agreed) {
              setAgreeError(true)
              return
            }
            try {
              const trimmed = referralCode.trim()
              await signUp.mutateAsync({
                ...data,
                ...(trimmed ? { referralCode: trimmed } : {}),
              })
              toast.show('환영해요! 첫 파티를 골라보세요 ✨', 'success')
              navigate('/discover')
            } catch (e) {
              toast.show((e as Error).message, 'error')
            }
          })}
        >
          <Input
            type="email"
            label="이메일"
            placeholder="you@rotifolk.dev"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="닉네임"
            placeholder="파티에서 불릴 이름"
            error={errors.nickname?.message}
            {...register('nickname')}
          />
          <div>
            <Input
              type="password"
              label="비밀번호"
              placeholder="8자 이상"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password', {
                onChange: (e) => setPwValue(e.target.value),
              })}
            />
            {strength && (
              <div className={styles.strengthRow} aria-live="polite">
                <div className={styles.strengthBars}>
                  <div className={`${styles.strengthBar} ${styles[strength.level]}`} />
                  <div
                    className={`${styles.strengthBar} ${strength.level !== 'weak' ? styles[strength.level] : ''}`}
                  />
                  <div
                    className={`${styles.strengthBar} ${strength.level === 'strong' ? styles.strong : ''}`}
                  />
                </div>
                <span className={`${styles.strengthLabel} ${styles[strength.level]}`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>
          <Input
            label="추천 코드 (선택)"
            placeholder="친구에게 받은 코드를 입력하면 3,000원 적립"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
          />
          <label className={`${styles.agreeRow} ${agreeError ? styles.agreeError : ''}`}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                if (e.target.checked) setAgreeError(false)
              }}
              className={styles.agreeCheck}
            />
            <span>
              <Link
                to="/policies"
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                이용약관
              </Link>{' '}
              및{' '}
              <Link
                to="/policies#privacy"
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                개인정보 처리방침
              </Link>
              에 동의합니다
            </span>
          </label>
          {agreeError && <p className={styles.agreeHint}>이용약관에 동의해 주세요.</p>}
          <Button type="submit" size="lg" fullWidth isLoading={signUp.isPending}>
            계정 만들기
          </Button>
        </form>
        <p className={styles.alt}>
          이미 계정이 있으세요?{' '}
          <Link to="/login" className={styles.link}>
            로그인
          </Link>
        </p>
      </Card>
    </div>
  )
}
