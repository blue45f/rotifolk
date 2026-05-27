import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { LoginSchema } from '@rotifolk/shared'
import type { LoginDto } from '@rotifolk/shared'
import { useLogin } from '@features/auth/queries'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(LoginSchema) })

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true" />
      <Card padding="lg" variant="glass" className={styles.card}>
        <h1 className={styles.title}>다시 만나서 반가워요 🍷</h1>
        <p className={styles.lead}>Rotifolk로 새로운 라운드를 시작해 보세요.</p>
        <form
          className={styles.form}
          onSubmit={handleSubmit(async (data) => {
            try {
              await login.mutateAsync(data)
              toast.show('환영해요! 다음 라운드로 안내할게요 ✨', 'success')
              navigate(from)
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
          <Link to="/signup" className={styles.link}>
            회원가입
          </Link>
        </p>
        <div className={styles.devHint}>
          데모 계정: <code>host@rotifolk.dev / rotifolk1234!</code>
        </div>
      </Card>
    </div>
  )
}
