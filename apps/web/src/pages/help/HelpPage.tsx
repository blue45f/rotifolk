import EmptyState from '@components/feedback/EmptyState'
import { Badge } from '@components/ui/Badge/Badge'
import { Input } from '@components/ui/Input/Input'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import styles from './Help.module.css'

import { addTutorialStep, normalizeTutorialStep } from '@/domains/tutorial/progress'

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

interface Faq {
  q: string
  a: string
}

const GUEST: Faq[] = [
  {
    q: '로테이션 매칭이 처음이에요. 어떻게 진행되나요?',
    a: '체크인 후 첫 라운드 시작 알림이 오면 자리로 이동하세요. 호스트가 “▶ 다음 라운드”를 누르면 자동으로 좌석이 안내됩니다.',
  },
  {
    q: '실명을 꼭 밝혀야 하나요?',
    a: '아니에요. 닉네임과 아바타만으로 충분합니다. “아바타 모드”가 켜진 모임에서는 모두가 실명 없이 참여해요.',
  },
  {
    q: '5분 라운드가 짧지 않나요?',
    a: '딱 한 호흡으로 가벼운 인사 → 자기소개 → 한 가지 질문 카드를 떠는 시간입니다. 라운드 사이 30~120초 휴식이 있어요.',
  },
  {
    q: '최종 매칭은 어떻게 정해지나요?',
    a: '마지막 라운드 후 “이 사람을 또 보고 싶어요” 투표를 받습니다. 양쪽이 서로를 골랐을 때만 1:1 채팅방이 열려요.',
  },
  {
    q: '환불은 어떻게 받나요?',
    a: '시작 시각 24시간 전까지 결제 화면에서 “환불 요청”을 눌러주세요. 24시간 이내라면 호스트와 직접 상의가 필요해요.',
  },
  {
    q: '낯가림이 심한데 괜찮을까요?',
    a: '질문 카드가 4단계 깊이로 어색함을 천천히 녹입니다. 첫 라운드는 가벼운 카드부터 시작하니 편하게 와요.',
  },
]

const HOST: Faq[] = [
  {
    q: '호스트가 되려면 어떻게 해야 하나요?',
    a: '/become-host에서 신청서를 작성하세요. 1~2일 안에 검토 후 인증돼요. 인증되면 “🎙️ 호스트” 배지가 부여되고 호스트 콘솔이 열립니다.',
  },
  {
    q: '몇 명부터 모임을 열 수 있나요?',
    a: '최소 2명부터 가능하지만, 로테이션은 4~12명일 때 가장 자연스러워요. 5:5 이성 매칭은 양쪽 5명을 권장합니다.',
  },
  {
    q: '장소가 없어요. 직접 빌려야 하나요?',
    a: '/venues에 제휴 장소 디렉터리가 있어요. 시간당 요금이 책정돼 있고 호스트 콘솔에서 한 번에 예약할 수 있어요.',
  },
  {
    q: '라이브 화면이 너무 정신없어 보이면?',
    a: '단축키: 라운드 시작 ▶ 다음 라운드, ⏸ 라운드 종료. 너무 많은 이벤트는 자제하세요. 한 라운드에 한 가지 액션이면 충분해요.',
  },
  {
    q: '음료/안주 무제한 모임은 어떻게 설정하나요?',
    a: '파티 개설 시 음료 패키지를 “무제한”으로, 안주는 “셰프 코스”로 두면 라이브에서 0원 주문으로 표시됩니다.',
  },
  {
    q: '후기에 답글을 달 수 있나요?',
    a: '네. 호스트 본인은 파티 상세의 후기 항목 아래에서 답글을 작성할 수 있어요. 답글은 골드 좌측 룰의 indent 박스로 노출돼요.',
  },
]

const BASE_STARTING_POINTS = [
  {
    to: '/tutorial',
    emoji: '🧭',
    title: '참가자 첫 단계',
    desc: '참여 과정과 체크인부터 매칭까지 한 번에 봐요.',
    isDemo: false,
  },
  {
    to: '/help?topic=host&open=0',
    emoji: '🎙️',
    title: '호스트 입문',
    desc: '호스트 신청·승인·운영 포인트를 빠르게 정리해요.',
    isDemo: false,
  },
  {
    to: '/login',
    emoji: '🎁',
    title: '데모로 바로 체험',
    desc: '데모 계정으로 가입 없이 흐름을 먼저 확인해 보세요.',
    isDemo: true,
  },
  {
    to: '/community?guide=1',
    emoji: '💬',
    title: '커뮤니티 첫 질문 시작',
    desc: '질문 카테고리로 바로 이동해 템플릿 글쓰기를 시작해요.',
    isDemo: false,
  },
  {
    to: '/policies?filter=required',
    emoji: '📜',
    title: '필수 정책만 우선 확인',
    desc: '회원 가입 후 필요한 필수 조항만 바로 점검해요.',
    isDemo: false,
  },
]

const BASE_FAST_START_FLOW = [
  {
    icon: '1',
    title: '첫 번째: 튜토리얼로 전체 플로우 파악',
    description: '홈/커뮤니티/도움말을 10초 안에 파악하고 지금 하고 싶은 동작을 고릅니다.',
    to: '/tutorial',
  },
  {
    icon: '2',
    title: '두 번째: 커뮤니티에서 질문 등록',
    description: '카테고리와 지역을 선택하고 템플릿으로 1분 내 글을 등록해 보세요.',
    to: '/community?guide=1',
  },
  {
    icon: '3',
    title: '세 번째: 답글과 데모로 확인',
    description: '데모 계정으로 로그인해 댓글 흐름을 실제로 체험해봅니다.',
    to: '/login',
  },
  {
    icon: '4',
    title: '네 번째: 필수 약관 동의 점검',
    description: '가입 전에 동의해야 할 필수 항목만 먼저 확인하고 체크하세요.',
    to: '/policies?filter=required',
  },
]

export default function HelpPage() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const tutorialStep = normalizeTutorialStep(searchParams.get('fromTutorial'))
  const isTutorialMode = tutorialStep === 'help'
  const initialTopic = searchParams.get('topic')
  const [tab, setTab] = useState<'guest' | 'host'>(
    isTutorialMode ? 'guest' : initialTopic === 'host' ? 'host' : 'guest'
  )
  const [open, setOpen] = useState<number | null>(0)
  const [query, setQuery] = useState('')
  const source = isTutorialMode || tab === 'guest' ? GUEST : HOST
  const currentPath = `${location.pathname}${location.search}${location.hash}` || '/'
  const encodedReturnPath = encodeURIComponent(currentPath)
  const tutorialReturnHref = isTutorialMode
    ? `/tutorial?from=${encodedReturnPath}&focus=help`
    : `/tutorial?from=${encodedReturnPath}`
  const communityGuideHref = isTutorialMode
    ? `/community?guide=1&template=first-question&fromTutorial=community&from=${encodedReturnPath}`
    : `/community?guide=1&from=${encodedReturnPath}`
  const policiesRequiredHref = isTutorialMode
    ? `/policies?filter=required&fromTutorial=policies&from=${encodedReturnPath}`
    : `/policies?filter=required&from=${encodedReturnPath}`
  const demoReturnHref = isTutorialMode
    ? `/login?demo=1&auto=1&fromTutorial=demo&from=${encodedReturnPath}`
    : `/login?demo=1&auto=1&from=${encodedReturnPath}`
  const fastStartFlow = useMemo(
    () =>
      BASE_FAST_START_FLOW.map((step) => {
        if (step.icon === '1') return { ...step, to: tutorialReturnHref }
        if (step.icon === '2') return { ...step, to: communityGuideHref }
        if (step.icon === '3') return { ...step, to: demoReturnHref }
        return { ...step, to: policiesRequiredHref }
      }),
    [communityGuideHref, demoReturnHref, policiesRequiredHref, tutorialReturnHref]
  )
  const startingPoints = useMemo(
    () =>
      BASE_STARTING_POINTS.map((item) => {
        if (item.isDemo) return { ...item, to: demoReturnHref }
        if (item.to === '/tutorial') return { ...item, to: tutorialReturnHref }
        if (item.to === '/community?guide=1') return { ...item, to: communityGuideHref }
        if (item.to === '/policies?filter=required') return { ...item, to: policiesRequiredHref }
        if (item.to.startsWith('/help'))
          return { ...item, to: `/help?topic=host&open=0&from=${encodedReturnPath}` }
        return item
      }),
    [
      communityGuideHref,
      demoReturnHref,
      encodedReturnPath,
      policiesRequiredHref,
      tutorialReturnHref,
    ]
  )

  useEffect(() => {
    const topic = searchParams.get('topic')
    const fromQuery = searchParams.get('open')
    const requestedTab = isTutorialMode ? 'guest' : topic === 'host' ? 'host' : 'guest'
    const rawOpen = fromQuery ? Number.parseInt(fromQuery, 10) : NaN
    const requestedOpen = Number.isInteger(rawOpen) && rawOpen >= 0 ? rawOpen : 0

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setTab(requestedTab)
      setOpen(requestedOpen)
    })
    return () => {
      cancelled = true
    }
  }, [isTutorialMode, searchParams])

  useEffect(() => {
    if (tutorialStep !== 'help') return
    addTutorialStep('help')
  }, [tutorialStep])

  const guideTitle = isTutorialMode ? '8단계로 모듈별로 시작해요' : '처음 와도 헷갈리지 않게'
  const guideCopy = isTutorialMode
    ? '처음 오신 분을 위한 튜토리얼 동선입니다. 가입 전 체험-커뮤니티-필수약관을 한 번에 이어 보세요.'
    : '참가자와 호스트가 자주 물어보는 것들만 모았어요.'
  const badgeLabel = isTutorialMode ? 'Tutorial' : 'FAQ'

  const items = useMemo(() => {
    const q = norm(query)
    if (!q) return source
    return source.filter((it) => norm(it.q).includes(q) || norm(it.a).includes(q))
  }, [source, query])

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <Badge tone={isTutorialMode ? 'info' : 'primary'} size="md">
          {badgeLabel}
        </Badge>
        <h1 className={styles.title}>{guideTitle}</h1>
        <p className={styles.muted}>{guideCopy}</p>
      </header>

      <section className={styles.quickStart} aria-label="8단계 빠른 가이드">
        <h2 className={styles.quickStartTitle}>8단계 빠른 가이드</h2>
        <ol className={styles.fastGuide}>
          {fastStartFlow.map((step) => (
            <li key={step.icon} className={styles.fastGuideItem}>
              <strong>{step.icon}</strong>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
              <Link to={step.to}>바로가기</Link>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.quickStart} aria-label="시작 가이드">
        <h2 className={styles.quickStartTitle}>8단계 빠른 시작</h2>
        <div className={styles.quickStartGrid}>
          {startingPoints.map((item) => (
            <Link key={item.to} to={item.to} className={styles.quickStartCard}>
              <span aria-hidden="true">{item.emoji}</span>
              <strong>{item.title}</strong>
              <small>{item.desc}</small>
            </Link>
          ))}
        </div>
      </section>

      {!isTutorialMode && (
        <Tabs
          tabs={[
            { value: 'guest', label: `🎟️ 참가자 (${GUEST.length})` },
            { value: 'host', label: `🎙️ 호스트 (${HOST.length})` },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v as 'guest' | 'host')
            setOpen(0)
          }}
        />
      )}

      <div className={styles.searchRow}>
        <Input
          type="search"
          placeholder="궁금한 키워드로 검색해 보세요"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(null)
          }}
          leftIcon={<span aria-hidden="true">🔎</span>}
          aria-label="FAQ 검색"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          emoji="🤔"
          title={`'${query.trim()}'에 대한 답을 찾지 못했어요`}
          description="다른 키워드를 시도하거나, 아래 채팅으로 직접 물어봐 주세요."
        />
      ) : (
        <ul className={styles.list}>
          {items.map((it, i) => {
            const isOpen = open === i
            return (
              <li key={`${tab}-${i}-${it.q}`} className={isOpen ? styles.open : ''}>
                <button
                  type="button"
                  className={styles.q}
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{it.q}</span>
                  <span className={styles.chev} aria-hidden="true">
                    {isOpen ? '–' : '+'}
                  </span>
                </button>
                {isOpen && <p className={styles.a}>{it.a}</p>}
              </li>
            )
          })}
        </ul>
      )}

      <footer className={styles.foot}>
        {isTutorialMode && (
          <p className={styles.footLinks}>
            <Link to={communityGuideHref}>커뮤니티 가이드 모드로 가기</Link>
            {' · '}
            <Link to={policiesRequiredHref}>필수 약관 확인</Link>
          </p>
        )}
        <p>
          더 궁금한 점이 있다면 <Link to="/chats">채팅</Link>으로 알려주세요.
        </p>
        <p className={styles.footLinks}>
          <Link to={isTutorialMode ? policiesRequiredHref : `/policies?from=${encodedReturnPath}`}>
            정책
          </Link>
          도 함께 확인해 주세요.
        </p>
      </footer>
    </div>
  )
}
