import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button, type ButtonVariant } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import { HostLevelBadge } from '@components/ui/HostLevelBadge/HostLevelBadge'
import { Icon } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { RecognizedConditions } from '@components/ui/RecognizedConditions/RecognizedConditions'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { Tooltip } from '@components/ui/Tooltip/Tooltip'
import { usePageMeta } from '@hooks/usePageMeta'
import { useThemeStore, type Theme } from '@store/themeStore'
import { useEffect, useState, type CSSProperties } from 'react'

import styles from './DesignPage.module.css'

import type { IconName } from '@components/ui/Icon/Icon'

/** Read the current resolved values of CSS custom properties against :root. */
function readTokens(names: readonly string[]): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const cs = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  for (const name of names) out[name] = cs.getPropertyValue(name).trim()
  return out
}

/**
 * Resolve a fixed set of CSS custom properties live, re-reading when the
 * `data-theme` attribute flips. Reads in a lazy initializer (one client-only
 * pass) and only setState from the MutationObserver callback — no synchronous
 * setState inside the effect body.
 */
function useResolvedTokens(names: readonly string[]): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>(() => readTokens(names))
  useEffect(() => {
    const observer = new MutationObserver(() => setValues(readTokens(names)))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [names])
  return values
}

const APRICOT = [
  '--brand-apricot-900',
  '--brand-apricot-800',
  '--brand-apricot-700',
  '--brand-apricot-600',
  '--brand-apricot-500',
  '--brand-apricot-400',
  '--brand-apricot-300',
  '--brand-apricot-200',
  '--brand-apricot-100',
  '--brand-apricot-50',
] as const
const TEAL = [
  '--brand-teal-700',
  '--brand-teal-600',
  '--brand-teal-500',
  '--brand-teal-400',
  '--brand-teal-300',
  '--brand-teal-100',
] as const
const AMBER = [
  '--brand-amber-700',
  '--brand-amber-600',
  '--brand-amber-500',
  '--brand-amber-400',
  '--brand-amber-300',
  '--brand-amber-100',
] as const
const CATEGORY = [
  '--cat-wine',
  '--cat-coffee',
  '--cat-tea',
  '--cat-whisky',
  '--cat-cocktail',
  '--cat-beer',
  '--cat-sake',
  '--cat-dessert',
  '--cat-custom',
] as const
const SEMANTIC = [
  '--color-primary',
  '--color-accent',
  '--color-success',
  '--color-warning',
  '--color-danger',
  '--color-info',
] as const
const NEUTRAL = [
  '--color-bg',
  '--color-surface',
  '--color-surface-soft',
  '--color-surface-elev',
  '--color-border',
  '--color-text',
  '--color-text-muted',
  '--color-text-subtle',
  '--brand-paper-100',
  '--brand-clay-900',
] as const

const ALL_TOKENS = [...APRICOT, ...TEAL, ...AMBER, ...CATEGORY, ...SEMANTIC, ...NEUTRAL] as const

const TYPE_SCALE = [
  { token: '--fs-6xl', label: 'Display 6xl', sample: '첫 잔' },
  { token: '--fs-5xl', label: 'Display 5xl', sample: '해 지기 직전' },
  { token: '--fs-4xl', label: 'Heading 4xl', sample: '로테이션 파티' },
  { token: '--fs-3xl', label: 'Heading 3xl', sample: '오늘의 모임' },
  { token: '--fs-2xl', label: 'Heading 2xl', sample: '섹션 제목' },
  { token: '--fs-xl', label: 'Title xl', sample: '카드 제목 한 줄' },
  { token: '--fs-lg', label: 'Body lg', sample: '리드 문단 — 조금 더 큰 본문' },
  { token: '--fs-md', label: 'Body md', sample: '기본 본문 텍스트 크기입니다.' },
  { token: '--fs-sm', label: 'Body sm', sample: '보조 설명과 라벨에 쓰는 작은 본문.' },
  { token: '--fs-xs', label: 'Caption xs', sample: '캡션 · 메타 정보' },
  { token: '--fs-2xs', label: 'Micro 2xs', sample: '아주 작은 라벨 / 칩' },
] as const

const SPACE_SCALE = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-10',
  '--space-12',
  '--space-16',
  '--space-20',
  '--space-24',
] as const

const RADII = [
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
  '--radius-pill',
] as const

const ELEVATION = [
  '--shadow-xs',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--shadow-glow',
] as const

const EASINGS = [
  { token: '--ease-out', label: 'ease-out' },
  { token: '--ease-out-quart', label: 'ease-out-quart' },
  { token: '--ease-out-expo', label: 'ease-out-expo' },
  { token: '--ease-in-out', label: 'ease-in-out' },
  { token: '--ease-spring', label: 'ease-spring' },
] as const

const DURATIONS = ['--dur-fast', '--dur-base', '--dur-slow', '--dur-deliberate'] as const

const THEME_OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: 'light', label: '라이트', icon: 'sun' },
  { value: 'dark', label: '다크', icon: 'moon' },
  { value: 'system', label: '시스템', icon: 'monitor' },
]

const NAV_SECTIONS = [
  { id: 'color', label: '색상' },
  { id: 'type', label: '타이포그래피' },
  { id: 'space', label: '간격' },
  { id: 'radii', label: '모서리' },
  { id: 'elevation', label: '그림자' },
  { id: 'motion', label: '모션' },
  { id: 'components', label: '컴포넌트' },
] as const

const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'soft',
  'outline',
  'ghost',
  'danger',
  'gold',
]

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className={styles.swatch}>
      <div className={styles.swatchChip} style={{ background: `var(${name})` }} />
      <div className={styles.swatchMeta}>
        <span className={styles.swatchName}>{name}</span>
        <span className={styles.swatchValue}>{value || '—'}</span>
      </div>
    </div>
  )
}

function ColorGroup({
  title,
  names,
  values,
}: {
  title: string
  names: readonly string[]
  values: Record<string, string>
}) {
  return (
    <div>
      <p className={styles.groupTitle}>{title}</p>
      <div className={styles.swatchGrid} style={{ marginTop: 'var(--space-3)' }}>
        {names.map((n) => (
          <Swatch key={n} name={n} value={values[n] ?? ''} />
        ))}
      </div>
    </div>
  )
}

export default function DesignPage() {
  usePageMeta({
    title: 'Design System',
    description: 'Rotifolk 디자인 시스템 — Aperitivo · Sunset Social 토큰과 컴포넌트 가이드.',
    path: '/design',
  })
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const values = useResolvedTokens(ALL_TOKENS)

  const [tab, setTab] = useState('open')
  const [chipSelected, setChipSelected] = useState(true)
  const [motionPlaying, setMotionPlaying] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={`container ${styles.mastheadInner}`}>
          <div className={styles.mastheadText}>
            <p className={styles.wordmark}>rotifolk</p>
            <h1 className={styles.mastheadTitle}>Design System</h1>
            <p className={styles.mastheadDesc}>
              해 지기 직전 첫 잔을 나누는 황금빛 사교 시간. 이 페이지의 토큰과 컴포넌트는 실제 앱이
              쓰는 것과 동일합니다 — 값은 현재 테마 기준으로 라이브 계산됩니다.
            </p>
          </div>
          <div className={styles.themeToggle} role="group" aria-label="테마 전환">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={styles.themeOption}
                aria-pressed={theme === opt.value}
                onClick={() => setTheme(opt.value)}
              >
                <Icon name={opt.icon} aria-hidden />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={`container ${styles.shell}`}>
        <nav className={styles.nav} aria-label="디자인 시스템 섹션">
          {NAV_SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={styles.navLink}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className={styles.content}>
          {/* —— Color —— */}
          <section id="color" className={styles.section} aria-labelledby="design-color-title">
            <div className={styles.sectionHead}>
              <h2 id="design-color-title" className={styles.sectionTitle}>
                색상
              </h2>
              <p className={styles.sectionLede}>
                Apricot이 주조색, Teal이 또렷해야 하는 순간(라이브·매칭·핵심 CTA)의 강조색입니다.
                모든 중성색은 따뜻한 hue로 미세 틴트되어 종이 질감을 유지합니다.
              </p>
            </div>
            <ColorGroup title="Apricot · primary ramp" names={APRICOT} values={values} />
            <ColorGroup title="Teal · accent" names={TEAL} values={values} />
            <ColorGroup title="Amber · secondary" names={AMBER} values={values} />
            <ColorGroup title="Category accents" names={CATEGORY} values={values} />
            <ColorGroup title="Semantic" names={SEMANTIC} values={values} />
            <ColorGroup title="Neutrals · paper · clay" names={NEUTRAL} values={values} />
          </section>

          {/* —— Typography —— */}
          <section id="type" className={styles.section} aria-labelledby="design-type-title">
            <div className={styles.sectionHead}>
              <h2 id="design-type-title" className={styles.sectionTitle}>
                타이포그래피
              </h2>
              <p className={styles.sectionLede}>
                Pretendard Variable이 본문·제목·라벨을 모두 운반하고, JetBrains Mono는 토큰값과 코드
                같은 기술적 텍스트에만 등장합니다.
              </p>
            </div>

            <div className={styles.fontPair}>
              <div className={styles.fontSpecimen}>
                <span className={styles.fontGlyphs}>Aa 가나다 0123</span>
                <span className={styles.fontLabel}>Pretendard Variable · --font-sans</span>
              </div>
              <div className={styles.fontSpecimen}>
                <span className={`${styles.fontGlyphs} ${styles.fontGlyphsMono}`}>
                  Aa 0123 {'{ }'}
                </span>
                <span className={styles.fontLabel}>JetBrains Mono · --font-mono</span>
              </div>
            </div>

            <div>
              {TYPE_SCALE.map((t) => (
                <div key={t.token} className={styles.typeRow}>
                  <span
                    className={styles.typeSample}
                    style={{ fontSize: `var(${t.token})`, fontWeight: 'var(--fw-semibold)' }}
                  >
                    {t.sample}
                  </span>
                  <span className={styles.typeMeta}>
                    {t.label} · {t.token}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <p className={styles.groupTitle}>Prose · 65–75ch</p>
              <p className={styles.prose} style={{ marginTop: 'var(--space-3)' }}>
                로테이션 파티는 모르는 사람들이 5분 라운드로 돌아가며 한 잔을 나누는 모임입니다.
                본문 텍스트는 한 줄에 65–75자 사이로 유지해 읽는 리듬을 끊지 않습니다. 줄 높이는
                relaxed, 문단은 text-wrap: pretty로 마지막 줄의 외톨이 단어를 줄여 가독성을
                높입니다.
              </p>
            </div>
          </section>

          {/* —— Spacing —— */}
          <section id="space" className={styles.section} aria-labelledby="design-space-title">
            <div className={styles.sectionHead}>
              <h2 id="design-space-title" className={styles.sectionTitle}>
                간격
              </h2>
              <p className={styles.sectionLede}>
                4px 베이스의 간격 스케일. 막대 길이가 실제 값입니다.
              </p>
            </div>
            <div className={styles.scaleList}>
              {SPACE_SCALE.map((token) => (
                <div key={token} className={styles.scaleRow}>
                  <span className={styles.scaleToken}>{token.replace('--space-', 'space-')}</span>
                  <span className={styles.scaleValue}>{values[token] ?? ''}</span>
                  <span className={styles.scaleBar} style={{ width: `var(${token})` }} />
                </div>
              ))}
            </div>
          </section>

          {/* —— Radii —— */}
          <section id="radii" className={styles.section} aria-labelledby="design-radii-title">
            <div className={styles.sectionHead}>
              <h2 id="design-radii-title" className={styles.sectionTitle}>
                모서리
              </h2>
            </div>
            <div className={styles.radiiGrid}>
              {RADII.map((token) => (
                <div key={token} className={styles.radiusBox}>
                  <div className={styles.radiusSwatch} style={{ borderRadius: `var(${token})` }} />
                  <span className={styles.scaleToken}>{token.replace('--radius-', 'radius-')}</span>
                </div>
              ))}
            </div>
          </section>

          {/* —— Elevation —— */}
          <section
            id="elevation"
            className={styles.section}
            aria-labelledby="design-elevation-title"
          >
            <div className={styles.sectionHead}>
              <h2 id="design-elevation-title" className={styles.sectionTitle}>
                그림자
              </h2>
              <p className={styles.sectionLede}>
                Apricot/Clay로 틴트된 따뜻한 그림자. glow는 라이브·매칭 강조에만 씁니다.
              </p>
            </div>
            <div className={styles.elevGrid}>
              {ELEVATION.map((token) => (
                <div key={token} className={styles.elevCard} style={{ boxShadow: `var(${token})` }}>
                  {token.replace('--shadow-', 'shadow-')}
                </div>
              ))}
            </div>
          </section>

          {/* —— Motion —— */}
          <section id="motion" className={styles.section} aria-labelledby="design-motion-title">
            <div className={styles.sectionHead}>
              <h2 id="design-motion-title" className={styles.sectionTitle}>
                모션
              </h2>
              <p className={styles.sectionLede}>
                Ease-out 계열로 끝맺음을 부드럽게. 바운스는 절제하고, 모든 모션은
                prefers-reduced-motion에서 즉시 정지합니다. 아래 데모로 이징 차이를 직접 보세요.
              </p>
            </div>

            <div className={styles.motionBlock}>
              <div className={`${styles.easingGrid} ${motionPlaying ? styles.motionPlaying : ''}`}>
                {EASINGS.map((e) => (
                  <div key={e.token} className={styles.easingRow}>
                    <span className={styles.easingName}>{e.label}</span>
                    <div className={styles.easingTrack}>
                      <span
                        className={styles.easingDot}
                        style={{ '--easing': `var(${e.token})` } as CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                className={styles.motionBtn}
                variant="soft"
                size="sm"
                onClick={() => setMotionPlaying((p) => !p)}
              >
                {motionPlaying ? '되돌리기' : '이징 재생'}
              </Button>
              <div className={styles.durList}>
                {DURATIONS.map((token) => (
                  <span key={token} className={styles.durChip}>
                    {token.replace('--dur-', 'dur-')} · {values[token] ?? ''}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* —— Components —— */}
          <section
            id="components"
            className={styles.section}
            aria-labelledby="design-components-title"
          >
            <div className={styles.sectionHead}>
              <h2 id="design-components-title" className={styles.sectionTitle}>
                컴포넌트
              </h2>
              <p className={styles.sectionLede}>
                실제 <code>components/ui</code>에서 가져온 컴포넌트입니다. 상태별 캡션을 함께
                둡니다.
              </p>
            </div>

            <div className={styles.specimen}>
              {/* Button */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Button · variants</p>
                <div className={styles.specimenRow}>
                  {BUTTON_VARIANTS.map((v) => (
                    <Button key={v} variant={v}>
                      {v}
                    </Button>
                  ))}
                </div>
                <p className={styles.groupTitle}>Button · sizes &amp; states</p>
                <div className={styles.specimenRow}>
                  <Button size="sm">sm</Button>
                  <Button size="md">md</Button>
                  <Button size="lg">lg</Button>
                  <Button size="xl">xl</Button>
                </div>
                <div className={styles.specimenRow}>
                  <Button leftIcon={<Icon name="plus" />}>leftIcon</Button>
                  <Button rightIcon={<Icon name="chevron-right" />}>rightIcon</Button>
                  <Button isLoading>loading</Button>
                  <Button disabled>disabled</Button>
                </div>
                <p className={styles.caption}>variant × size × {`{ icon, loading, disabled }`}</p>
              </div>

              {/* Input */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Input · field states</p>
                <div className={styles.specimenCol}>
                  <Input
                    label="기본"
                    placeholder="placeholder 텍스트"
                    hint="도움말 힌트가 여기에"
                  />
                  <Input
                    label="아이콘 + 슬롯"
                    placeholder="검색어"
                    leftIcon={<Icon name="search" />}
                  />
                  <Input label="오류" defaultValue="잘못된 값" error="필수 항목입니다" />
                  <Input label="비활성" placeholder="입력 불가" disabled />
                </div>
                <p className={styles.caption}>default · focus(클릭) · error · disabled</p>
              </div>

              {/* Tabs */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Tabs · segmented control</p>
                <div className={styles.specimenRow}>
                  <Tabs
                    label="예시 탭"
                    value={tab}
                    onChange={setTab}
                    tabs={[
                      { value: 'open', label: '모집 중', icon: <Icon name="moon" /> },
                      { value: 'live', label: '진행 중', icon: <Icon name="live" /> },
                      { value: 'past', label: '지난', icon: <Icon name="archive" /> },
                    ]}
                  />
                </div>
                <div className={styles.specimenRow}>
                  <Tabs
                    label="언더라인 탭"
                    variant="underline"
                    size="sm"
                    value={tab}
                    onChange={setTab}
                    tabs={[
                      { value: 'open', label: '전체' },
                      { value: 'live', label: '인기', badge: 3 },
                      { value: 'past', label: '최근' },
                    ]}
                  />
                </div>
                <p className={styles.caption}>pill · underline · selected = {tab}</p>
              </div>

              {/* Chip */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Chip · selectable filters</p>
                <div className={styles.specimenRow}>
                  <Chip
                    leadingEmoji="🍷"
                    selected={chipSelected}
                    onClick={() => setChipSelected((s) => !s)}
                  >
                    와인
                  </Chip>
                  <Chip leadingEmoji="☕">커피</Chip>
                  <Chip leadingIcon={<Icon name="pin" />}>내 동네</Chip>
                  <Chip leadingIcon={<Icon name="bolt" />}>즉석</Chip>
                </div>
                <p className={styles.caption}>selected(토글) · default · with icon</p>
              </div>

              {/* Badge & HostLevelBadge */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Badge · tones</p>
                <div className={styles.specimenRow}>
                  <Badge tone="primary">primary</Badge>
                  <Badge tone="success">모집 중</Badge>
                  <Badge tone="warning">마감 임박</Badge>
                  <Badge tone="danger">취소</Badge>
                  <Badge tone="info">정보</Badge>
                  <Badge tone="gold">골드</Badge>
                  <Badge tone="wine">와인</Badge>
                  <Badge tone="tea" outlined>
                    outlined
                  </Badge>
                </div>
                <p className={styles.groupTitle}>HostLevelBadge</p>
                <div className={styles.specimenRow}>
                  <HostLevelBadge level="newbie" />
                  <HostLevelBadge level="sapling" />
                  <HostLevelBadge level="sommelier" />
                  <HostLevelBadge level="curator" />
                  <HostLevelBadge level="legend" size="md" />
                </div>
                <p className={styles.caption}>tone × outlined · 호스트 등급(새내기–레전드)</p>
              </div>

              {/* Avatar */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Avatar · sizes &amp; rings</p>
                <div className={styles.specimenRow}>
                  <Avatar size="xs" initials="로" label="xs" />
                  <Avatar size="sm" emoji="🍷" label="sm" />
                  <Avatar size="md" emoji="☕" pattern="sparkle" ring="soft" label="md" />
                  <Avatar
                    size="lg"
                    initials="HJ"
                    ring="glow"
                    hue="var(--brand-teal-500)"
                    label="lg"
                  />
                  <Avatar size="xl" emoji="🥃" pattern="wave" ring="gold" label="xl" />
                </div>
                <p className={styles.caption}>xs–xl · pattern · ring(none/soft/glow/gold)</p>
              </div>

              {/* Card (single, never nested) */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Card · variants</p>
                <div className={styles.cardDemoGrid}>
                  <Card variant="plain">
                    <Card.Header>
                      <span className={styles.cardTitle}>plain</span>
                    </Card.Header>
                    <Card.Body>
                      <p className={styles.cardText}>기본 표면 위 카드. 본문 텍스트.</p>
                    </Card.Body>
                  </Card>
                  <Card variant="soft" hoverable>
                    <Card.Header>
                      <span className={styles.cardTitle}>soft · hoverable</span>
                    </Card.Header>
                    <Card.Body>
                      <p className={styles.cardText}>은은한 표면. 호버 시 살짝 떠오릅니다.</p>
                    </Card.Body>
                  </Card>
                  <Card variant="twilight">
                    <Card.Header>
                      <span
                        className={styles.cardTitle}
                        style={{ color: 'var(--color-text-inverse)' }}
                      >
                        twilight
                      </span>
                    </Card.Header>
                    <Card.Body>
                      <p className={styles.cardText} style={{ color: 'var(--color-text-inverse)' }}>
                        석양 그라데이션 표면.
                      </p>
                    </Card.Body>
                  </Card>
                </div>
                <p className={styles.caption}>plain · soft(hoverable) · twilight</p>
              </div>

              {/* Tooltip + Sheet */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>Tooltip &amp; Sheet · overlays</p>
                <div className={styles.specimenRow}>
                  <Tooltip label="포털로 오버플로를 벗어나는 툴팁">
                    <Button variant="outline" aria-label="툴팁 트리거">
                      툴팁 호버
                    </Button>
                  </Tooltip>
                  <Button variant="primary" onClick={() => setSheetOpen(true)}>
                    시트 열기
                  </Button>
                </div>
                <p className={styles.caption}>Radix 포털 · 포커스 트랩 · Esc 닫기</p>
                <Sheet
                  open={sheetOpen}
                  onClose={() => setSheetOpen(false)}
                  title="바텀 시트"
                  description="Radix Dialog 기반 — 포커스 트랩과 스크롤 락이 보장됩니다."
                  footer={
                    <Button fullWidth onClick={() => setSheetOpen(false)}>
                      닫기
                    </Button>
                  }
                >
                  <p className={styles.cardText}>
                    시트 본문 영역입니다. 모바일에서는 바텀 시트, 데스크톱에서는 모달처럼
                    동작합니다.
                  </p>
                </Sheet>
              </div>

              {/* Signature: RecognizedConditions */}
              <div className={styles.specimenGroup}>
                <p className={styles.groupTitle}>RecognizedConditions · smart-search row</p>
                <RecognizedConditions
                  chips={[
                    { key: 'cat', label: '와인', emoji: '🍷' },
                    { key: 'area', label: '성수동', emoji: '📍' },
                    { key: 'time', label: '저녁', emoji: '🌙' },
                    { key: 'cap', label: '4–6인', emoji: '👥' },
                  ]}
                />
                <p className={styles.caption}>자연어 검색이 인식한 조건을 읽기전용 칩으로 표시</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
