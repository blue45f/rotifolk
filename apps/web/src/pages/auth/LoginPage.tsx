import { usePrompt } from '@components/feedback/Prompt/usePrompt'
import { useToast } from '@components/feedback/Toast/useToast'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Input } from '@components/ui/Input/Input'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema } from '@rotifolk/shared'
import { useAuthStore } from '@store/authStore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom'

import styles from './AuthPage.module.css'

import type { LoginDto, User } from '@rotifolk/shared'

import { GoogleSignInButton } from '@/domains/auth/GoogleSignInButton'
import { useAuthConfig, useGoogleLogin, useLogin } from '@/domains/auth/queries'
import { addTutorialStep, normalizeTutorialStep } from '@/domains/tutorial/progress'
import { api } from '@/infrastructure/api'

const DEMO_ACCOUNT: LoginDto = {
  email: 'host@rotifolk.dev',
  password: 'rotifolk1234!',
}

function resolveReturnPath(raw: string | null, location: Location): string {
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.includes('://')) return '/'
  try {
    const target = new URL(raw, location.origin)
    if (target.origin !== location.origin) return '/'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}

export default function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const prompt = usePrompt()
  const setSession = useAuthStore((s) => s.setSession)
  const authConfig = useAuthConfig()
  const googleLogin = useGoogleLogin()
  const [kakaoLoading, setKakaoLoading] = useState(false)
  const stateFrom = (location.state as { from?: string } | null)?.from
  const from = useMemo(
    () => resolveReturnPath(searchParams.get('from') ?? stateFrom ?? null, window.location),
    [searchParams, stateFrom]
  )
  const isDemoMode = searchParams.get('demo') === '1'
  const fromTutorial = normalizeTutorialStep(searchParams.get('fromTutorial'))

  const completeDemoStep = useCallback(() => {
    if (fromTutorial === 'demo') {
      addTutorialStep('demo')
    }
  }, [fromTutorial])

  const handleGoogleCredential = async (credential: string) => {
    try {
      const data = await googleLogin.mutateAsync(credential)
      toast.show(`${data.user.nickname}님, 환영해요! ✨`, 'success')
      completeDemoStep()
      navigate(from, { replace: true })
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(
      LoginSchema as unknown as Parameters<typeof zodResolver>[0]
    ) as unknown as Resolver<LoginDto>,
    defaultValues: isDemoMode
      ? {
          email: DEMO_ACCOUNT.email,
          password: DEMO_ACCOUNT.password,
        }
      : undefined,
  })

  const fillDemoForm = useCallback(() => {
    setValue('email', DEMO_ACCOUNT.email, { shouldValidate: true })
    setValue('password', DEMO_ACCOUNT.password, { shouldValidate: true })
  }, [setValue])

  const runDemoLogin = useCallback(async () => {
    try {
      fillDemoForm()
      const data = await login.mutateAsync(DEMO_ACCOUNT)
      setSession(data)
      toast.show('데모 계정으로 입장했어요. ✨', 'success')
      completeDemoStep()
      navigate(from, { replace: true })
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }, [completeDemoStep, fillDemoForm, from, login, navigate, setSession, toast])

  const autoDemoMode = useRef(false)
  useEffect(() => {
    if (!isDemoMode) return
    fillDemoForm()
    if (searchParams.get('auto') !== '1' || autoDemoMode.current) return
    autoDemoMode.current = true
    void runDemoLogin()
  }, [fillDemoForm, isDemoMode, runDemoLogin, searchParams])

  const handleKakao = async () => {
    if (kakaoLoading) return
    const input = await prompt({
      title: '카카오로 시작하기',
      description: '데모 환경이라 실제 카카오 인증 없이 닉네임만 정하면 돼요.',
      label: '닉네임을 입력해주세요',
      placeholder: '2~16자, 비우면 랜덤 닉네임',
      confirmLabel: '입장하기',
      maxLength: 16,
    })
    if (input === null) return
    const nickname =
      input.trim().length >= 2
        ? input.trim().slice(0, 16)
        : `카카오${Math.floor(Math.random() * 9000 + 1000)}`
    const kakaoId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    try {
      setKakaoLoading(true)
      const data = await api.post<{ token: string; user: User }>('auth/kakao', {
        kakaoId,
        nickname,
      })
      setSession(data)
      toast.show(`${data.user.nickname}님, 카카오로 입장 완료! 🎉`, 'success')
      completeDemoStep()
      navigate(from, { replace: true })
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setKakaoLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />
      <Card padding="lg" variant="glass" className={styles.card}>
        <h1 className={styles.title}>다시 만나서 반가워요 🍷</h1>
        <p className={styles.lead}>Rotifolk로 새로운 라운드를 시작해 보세요.</p>
        <button
          type="button"
          className={styles.kakaoBtn}
          onClick={handleKakao}
          disabled={kakaoLoading}
        >
          <span aria-hidden="true">💬</span>
          {kakaoLoading ? '카카오로 입장 중…' : '카카오로 시작하기'}
        </button>
        <p className={styles.kakaoHint}>데모 환경: 실제 카카오 인증 없이 닉네임으로 진입</p>
        {authConfig.data?.googleClientId && (
          <div className={styles.googleRow}>
            <GoogleSignInButton
              clientId={authConfig.data.googleClientId}
              onCredential={handleGoogleCredential}
            />
          </div>
        )}
        <form
          className={styles.form}
          onSubmit={handleSubmit(async (data) => {
            try {
              await login.mutateAsync(data)
              toast.show('환영해요! 다음 라운드로 안내할게요 ✨', 'success')
              completeDemoStep()
              navigate(from, { replace: true })
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
            type="password"
            label="비밀번호"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" size="lg" fullWidth isLoading={login.isPending}>
            로그인
          </Button>
        </form>
        <p className={styles.alt}>
          아직 계정이 없으세요?{' '}
          <Link to={`/signup?from=${encodeURIComponent(from)}`} className={styles.link}>
            회원가입
          </Link>
        </p>
        <div className={styles.devHint}>
          데모 계정: <code>{`${DEMO_ACCOUNT.email} / ${DEMO_ACCOUNT.password}`}</code>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button type="button" size="sm" variant="outline" onClick={fillDemoForm}>
              데모 값 채우기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="gold"
              onClick={runDemoLogin}
              isLoading={login.isPending}
            >
              데모 계정으로 바로 시작
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
