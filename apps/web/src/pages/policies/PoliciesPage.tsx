import { Link } from 'react-router-dom'
import { refundSchedule } from '@rotifolk/shared'
import styles from './Policies.module.css'

const tiers = refundSchedule(24)

const SECTIONS = [
  {
    id: 'refund',
    icon: '↩️',
    title: '환불 정책',
    body: (
      <>
        <p className={styles.lead}>
          참가비 환불은 모임 시작 시각을 기준으로, 취소 시점에 따라 단계적으로 적용돼요. 전액 환불
          마감은 모임마다 다를 수 있어요(기본 시작 24시간 전).
        </p>
        <ul className={styles.tiers}>
          {tiers.map((t) => (
            <li key={t.label} className={styles.tier}>
              <span className={styles.tierLabel}>{t.label}</span>
              <span className={styles.tierRate} data-zero={t.rate === 0}>
                {Math.round(t.rate * 100)}% 환불
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          주최자 취소 또는 성비·인원 미달로 인한 자동 취소는 시점과 무관하게{' '}
          <strong>전액 환불</strong>
          됩니다.
        </p>
      </>
    ),
  },
  {
    id: 'cancel',
    icon: '🗓️',
    title: '취소 정책',
    body: (
      <p>
        참가 취소는 마이 페이지에서 직접 할 수 있어요. 취소 즉시 자리가 풀려 대기자에게 기회가
        넘어가고, 위 환불 정책에 따라 환불이 진행돼요. 성비 균형을 위해 한쪽 성별이 가득 찬 경우
        취소분은 같은 성별 대기자에게 우선 배정됩니다.
      </p>
    ),
  },
  {
    id: 'noshow',
    icon: '🚪',
    title: '노쇼 정책',
    body: (
      <p>
        예약 후 연락 없이 참석하지 않으면 <strong>환불되지 않으며</strong>, 반복 노쇼는 신뢰 점수에
        반영돼 일부 모임 참여가 제한될 수 있어요. 못 가게 되면 시작 전에 꼭 취소해 주세요. 다른
        참가자의 한 자리가 소중하니까요.
      </p>
    ),
  },
  {
    id: 'privacy',
    icon: '🔐',
    title: '개인정보 · 민감정보',
    body: (
      <ul className={styles.bullets}>
        <li>
          전화번호는 <strong>해시로만 대조</strong>에 쓰이고 원본은 회피 목록에 저장하지 않아요.
        </li>
        <li>
          연결 채널(채팅·인스타·카톡·번호)은 매칭된 상대와 <strong>양쪽이 동의한 채널만</strong>{' '}
          단계적으로 공개돼요. 채팅은 번호 노출 없이 안전하게 시작합니다.
        </li>
        <li>
          직업·회사·소득 같은 신상 정보는 <strong>인증 배지와 구간만</strong> 저장하고 증빙 원본은
          보관하지 않아요. 항목별로 공개 범위(전체·매칭된 상대·비공개)를 고를 수 있어요.
        </li>
        <li>
          받은 호감 수와 ‘오늘의 인기남/인기녀’ 선정 참여 여부는 프로필 설정에서 직접 켜고 끌 수
          있어요.
        </li>
      </ul>
    ),
  },
  {
    id: 'safety',
    icon: '🛟',
    title: '안전 · 지인 회피',
    body: (
      <p>
        마주치고 싶지 않은 사람의 번호를 등록하면(해시 저장) 같은 모임에서 자동으로 매칭·좌석에서
        제외돼요. 같은 회사 자동 회피, 차단도 동일하게 적용됩니다. 불쾌한 경험은 언제든 신고할 수
        있고, 신고 내역은 안전팀이 검토해요.
      </p>
    ),
  },
]

export default function PoliciesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>ROTIFOLK POLICIES</span>
        <h1 className={styles.title}>이용 · 환불 · 개인정보 정책</h1>
        <p className={styles.sub}>
          누구나 안심하고 동네 로테이션 모임을 열고 참여할 수 있도록 정한 약속이에요.
        </p>
      </header>

      <nav className={styles.toc} aria-label="정책 목차">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={styles.tocLink}>
            {s.icon} {s.title}
          </a>
        ))}
      </nav>

      <div className={styles.sections}>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span aria-hidden="true">{s.icon}</span> {s.title}
            </h2>
            <div className={styles.sectionBody}>{s.body}</div>
          </section>
        ))}
      </div>

      <p className={styles.footer}>마지막 업데이트 2026년 5월 · 문의는 고객센터로 보내주세요.</p>

      <div className={styles.footerLinks}>
        <Link to="/help">FAQ</Link>
        <span aria-hidden="true">·</span>
        <Link to="/discover">파티 탐색하러 가기</Link>
      </div>
    </div>
  )
}
