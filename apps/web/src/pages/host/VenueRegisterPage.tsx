import { useToast } from '@components/feedback/Toast/useToast'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import { useCreateVenue } from '@features/venueBooking/queries'
import { CreateVenueSchema, SEOUL_AREAS, type VenueKind } from '@rotifolk/shared'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import styles from './VenueRegister.module.css'

const KINDS: { value: VenueKind; label: string; emoji: string }[] = [
  { value: 'wine-bar', label: '와인바', emoji: '🍷' },
  { value: 'cafe', label: '카페', emoji: '☕' },
  { value: 'tea-house', label: '다실', emoji: '🍵' },
  { value: 'whisky-bar', label: '위스키바', emoji: '🥃' },
  { value: 'lounge', label: '라운지', emoji: '🛋️' },
  { value: 'rooftop', label: '루프탑', emoji: '🌆' },
  { value: 'restaurant', label: '레스토랑', emoji: '🍽️' },
  { value: 'pub', label: '펍', emoji: '🍺' },
  { value: 'gallery', label: '갤러리', emoji: '🖼️' },
  { value: 'studio', label: '스튜디오', emoji: '🎨' },
]
const AREAS = Object.keys(SEOUL_AREAS)
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function splitCsv(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

export default function VenueRegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreateVenue()

  const [f, setF] = useState({
    name: '',
    kind: 'wine-bar' as VenueKind,
    area: '한남동',
    address: '',
    capacity: 16,
    pricePerHourKRW: 100_000,
    cleaningFeeKRW: 20_000,
    minHours: 3,
    open: '11:00',
    close: '23:00',
    instantBook: true,
    selfHostEnabled: true,
    weekendMultiplier: 1.2,
    peakMultiplier: 1.4,
    amenities: '',
    vibeTags: '',
    useCases: '',
    photo1: '',
    photo2: '',
    hostBlurb: '',
    parkingNote: '',
    entryInfo: '',
    wifiSsid: '',
    wifiPassword: '',
  })
  const [closedWeekdays, setClosed] = useState<number[]>([])
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const touch = (k: string) => setTouched((p) => ({ ...p, [k]: true }))

  // Lightweight inline guidance for the two free-text essentials. The
  // authoritative gate is still CreateVenueSchema in submit(); this only
  // surfaces a hint once a field has been visited.
  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = '공간 이름을 입력해주세요.'
    if (!f.address.trim()) e.address = '주소를 입력해주세요.'
    return e
  }, [f.name, f.address])

  const submit = async () => {
    const coords = SEOUL_AREAS[f.area]
    const dto = {
      name: f.name,
      kind: f.kind,
      area: f.area,
      address: f.address,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      capacity: Number(f.capacity),
      pricePerHourKRW: Number(f.pricePerHourKRW),
      cleaningFeeKRW: Number(f.cleaningFeeKRW),
      minHours: Number(f.minHours),
      openMinute: toMin(f.open),
      closeMinute: toMin(f.close),
      closedWeekdays,
      instantBook: f.instantBook,
      selfHostEnabled: f.selfHostEnabled,
      weekendMultiplier: Number(f.weekendMultiplier),
      peakMultiplier: Number(f.peakMultiplier),
      amenities: splitCsv(f.amenities),
      vibeTags: splitCsv(f.vibeTags),
      useCases: splitCsv(f.useCases),
      photos: [f.photo1, f.photo2].filter(Boolean),
      hostBlurb: f.hostBlurb || null,
      arrivalGuide: {
        parkingNote: f.parkingNote || undefined,
        entryInfo: f.entryInfo || undefined,
        wifiSsid: f.wifiSsid || undefined,
        wifiPassword: f.wifiPassword || undefined,
      },
    }
    const parsed = CreateVenueSchema.safeParse(dto)
    if (!parsed.success) {
      // Reveal inline hints on a failed submit so the host can see what's missing.
      setTouched((p) => ({ ...p, name: true, address: true }))
      const first = parsed.error.issues[0]
      toast.show(`입력을 확인해주세요: ${first.path.join('.')} ${first.message}`, 'error')
      return
    }
    try {
      await create.mutateAsync(parsed.data)
      toast.show('공간이 등록됐어요!', 'success')
      navigate('/host/space')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <span className={styles.kicker}>VENUE LISTING</span>
        <h1 className={styles.title}>공간 등록</h1>
        <p className={styles.lead}>
          한 번 등록해두면, 비는 시간에 직접 모임을 열거나 섭외를 받을 수 있어요.
        </p>
      </header>

      <form
        className={`container ${styles.body}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <fieldset className={styles.section}>
          <legend className={styles.legend}>
            <span className={styles.idx}>01</span>
            <span className={styles.legendText}>기본 정보</span>
          </legend>
          <Input
            label="공간 이름"
            placeholder="루즈 셀러"
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => touch('name')}
            error={touched.name ? errors.name : undefined}
            required
          />
          <div className={styles.field}>
            <span className={styles.fl}>종류</span>
            <div className={styles.chips}>
              {KINDS.map((k) => (
                <Chip
                  key={k.value}
                  selected={f.kind === k.value}
                  leadingEmoji={k.emoji}
                  onClick={() => set('kind', k.value)}
                >
                  {k.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fl}>동네</span>
            <div className={styles.chips}>
              {AREAS.map((a) => (
                <Chip key={a} selected={f.area === a} onClick={() => set('area', a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
          <Input
            label="주소"
            placeholder="서울 용산구 한남대로 1"
            value={f.address}
            onChange={(e) => set('address', e.target.value)}
            onBlur={() => touch('address')}
            error={touched.address ? errors.address : undefined}
            required
          />
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>
            <span className={styles.idx}>02</span>
            <span className={styles.legendText}>정원 & 가격</span>
          </legend>
          <div className={styles.grid2}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              label="최대 정원"
              value={f.capacity}
              onChange={(e) => set('capacity', Number(e.target.value))}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              label="시간당 대관료(원)"
              value={f.pricePerHourKRW}
              onChange={(e) => set('pricePerHourKRW', Number(e.target.value))}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              label="청소비(원)"
              value={f.cleaningFeeKRW}
              onChange={(e) => set('cleaningFeeKRW', Number(e.target.value))}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              label="최소 대관 시간"
              value={f.minHours}
              onChange={(e) => set('minHours', Number(e.target.value))}
            />
            <Input
              type="number"
              step="0.1"
              min={1}
              label="주말 배수"
              hint="평일 대비 주말 단가"
              value={f.weekendMultiplier}
              onChange={(e) => set('weekendMultiplier', Number(e.target.value))}
            />
            <Input
              type="number"
              step="0.1"
              min={1}
              label="피크 배수"
              hint="성수기·황금시간 단가"
              value={f.peakMultiplier}
              onChange={(e) => set('peakMultiplier', Number(e.target.value))}
            />
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>
            <span className={styles.idx}>03</span>
            <span className={styles.legendText}>영업 시간 & 휴무</span>
          </legend>
          <div className={styles.grid2}>
            <Input
              type="time"
              label="영업 시작"
              leftIcon={<Icon name="clock" />}
              value={f.open}
              onChange={(e) => set('open', e.target.value)}
            />
            <Input
              type="time"
              label="영업 종료"
              leftIcon={<Icon name="clock" />}
              value={f.close}
              onChange={(e) => set('close', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fl}>정기 휴무</span>
            <div className={styles.chips}>
              {WEEKDAYS.map((w, i) => (
                <Chip
                  key={i}
                  selected={closedWeekdays.includes(i)}
                  onClick={() =>
                    setClosed((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))
                  }
                >
                  {w}
                </Chip>
              ))}
            </div>
          </div>
          <p className={styles.hint}>
            휴무일·마감 후 시간이 자동으로 “유휴 시간 → 파티” 후보가 돼요.
          </p>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>
            <span className={styles.idx}>04</span>
            <span className={styles.legendText}>예약 정책 & 무드</span>
          </legend>
          <div className={styles.toggles}>
            <Toggle
              label="즉시 예약 허용"
              desc="호스트 요청 시 바로 확정"
              checked={f.instantBook}
              onChange={(v) => set('instantBook', v)}
            />
            <Toggle
              label="직접 호스팅"
              desc="내가 이 공간에서 모임 개설"
              checked={f.selfHostEnabled}
              onChange={(v) => set('selfHostEnabled', v)}
            />
          </div>
          <Input
            label="편의시설 (쉼표로 구분)"
            placeholder="글래스 무료, 루프탑, 음향"
            value={f.amenities}
            onChange={(e) => set('amenities', e.target.value)}
          />
          <Input
            label="무드 태그 (쉼표로 구분)"
            placeholder="루프뷰, 감성조명, 조용한"
            value={f.vibeTags}
            onChange={(e) => set('vibeTags', e.target.value)}
          />
          <Input
            label="추천 용도 (쉼표로 구분)"
            placeholder="와인모임, 소개팅, 북토크"
            value={f.useCases}
            onChange={(e) => set('useCases', e.target.value)}
          />
          <div className={styles.grid2}>
            <Input
              type="url"
              label="대표 사진 URL"
              placeholder="https://…"
              value={f.photo1}
              onChange={(e) => set('photo1', e.target.value)}
            />
            <Input
              type="url"
              label="추가 사진 URL"
              placeholder="https://…"
              value={f.photo2}
              onChange={(e) => set('photo2', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fl} htmlFor="venue-host-blurb">
              사장님 한마디
            </label>
            <textarea
              id="venue-host-blurb"
              className={styles.textarea}
              rows={2}
              placeholder="직접 셀렉한 와인으로 라운드를 채워요."
              value={f.hostBlurb}
              onChange={(e) => set('hostBlurb', e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>
            <span className={styles.idx}>05</span>
            <span className={styles.legendText}>도착 가이드</span>
            <span className={styles.legendSub}>
              <Icon name="shield" />
              확정 후에만 게스트에게 공개
            </span>
          </legend>
          <Input
            label="주차 안내"
            leftIcon={<Icon name="pin" />}
            value={f.parkingNote}
            onChange={(e) => set('parkingNote', e.target.value)}
          />
          <Input
            label="출입 안내"
            leftIcon={<Icon name="home" />}
            value={f.entryInfo}
            onChange={(e) => set('entryInfo', e.target.value)}
          />
          <div className={styles.grid2}>
            <Input
              label="Wi-Fi 이름"
              value={f.wifiSsid}
              onChange={(e) => set('wifiSsid', e.target.value)}
            />
            <Input
              label="Wi-Fi 비밀번호"
              value={f.wifiPassword}
              onChange={(e) => set('wifiPassword', e.target.value)}
            />
          </div>
        </fieldset>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate('/host/space')}>
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={create.isPending}
            leftIcon={<Icon name="home" />}
          >
            공간 등록하기
          </Button>
        </div>
      </form>
    </div>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleDot}>{checked && <Icon name="check" size={0.8} />}</span>
      <span>
        <strong>{label}</strong>
        {desc && <small>{desc}</small>}
      </span>
    </button>
  )
}
