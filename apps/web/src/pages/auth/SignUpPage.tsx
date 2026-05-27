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

export default function SignUpPage() {
  const signUp = useSignUp()
  const navigate = useNavigate()
  const toast = useToast()

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
            try {
              await signUp.mutateAsync(data)
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
          <Input
            type="password"
            label="비밀번호"
            placeholder="8자 이상"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
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
