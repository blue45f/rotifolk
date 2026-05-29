import { VERIFICATION_FIELD_LABEL, type VerificationField } from '@rotifolk/shared'
import { Badge } from '@components/ui/Badge/Badge'
import styles from './VerifiedBadges.module.css'

interface Props {
  fields: VerificationField[]
  size?: 'sm' | 'md'
  /** 빈 목록일 때 안내 문구 노출 여부 */
  showEmpty?: boolean
}

/** 인증 완료 필드를 골드 배지(체크 표시)로 렌더링하는 재사용 컴포넌트. */
export function VerifiedBadges({ fields, size = 'sm', showEmpty = false }: Props) {
  if (fields.length === 0) {
    if (!showEmpty) return null
    return (
      <span className={styles.empty}>
        <span aria-hidden="true">🪞</span>
        아직 인증한 항목이 없어요
      </span>
    )
  }
  return (
    <div className={styles.row}>
      {fields.map((field) => (
        <Badge key={field} tone="gold" size={size} className={styles.badge}>
          <span aria-hidden="true" className={styles.check}>
            ✓
          </span>
          {VERIFICATION_FIELD_LABEL[field]}
        </Badge>
      ))}
    </div>
  )
}

export default VerifiedBadges
