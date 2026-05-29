import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  EDUCATION_LABEL,
  INCOME_BAND_LABEL,
  MARITAL_STATUS_LABEL,
  VERIFICATION_FIELD_LABEL,
  type Education,
  type FieldVisibility,
  type IncomeBand,
  type MaritalStatus,
  type PreProfileDto,
  type ProfilePrompt,
  type VerifiableDetailField,
  type VerificationField,
  type VerificationMethod,
} from '@rotifolk/shared'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import { Tabs } from '@components/ui/Tabs/Tabs'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { VerifiedBadges } from '@components/profile/VerifiedBadges'
import { useAuthStore } from '@store/authStore'
import {
  useAddAvoidContacts,
  useAvoidContacts,
  useRemoveAvoidContact,
  useUpdateAvoidPrefs,
  useUpdateContact,
  useUpdatePrivacy,
  useUpdateProfile,
  useUpdateTrust,
  useVerifyField,
} from '@features/me/queries'
import styles from './ProfileStudio.module.css'

const VISIBILITY_LABEL: Record<FieldVisibility, string> = {
  public: '전체 공개',
  matched: '매칭된 상대만',
  hidden: '비공개',
}

const INCOME_BANDS = Object.keys(INCOME_BAND_LABEL) as IncomeBand[]
const MARITAL_STATUSES = Object.keys(MARITAL_STATUS_LABEL) as MaritalStatus[]
const EDUCATIONS = Object.keys(EDUCATION_LABEL) as Education[]

const VERIFY_METHODS: Record<VerificationField, VerificationMethod> = {
  identity: 'mobile-id',
  job: 'document',
  company: 'company-email',
  income: 'document',
  marital: 'document',
  education: 'document',
}

export default function ProfileStudioPage() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<'profile' | 'trust' | 'avoid'>('profile')

  if (!user) {
    return (
      <div className={`container ${styles.page}`}>
        <EmptyState emoji="🌙" title="로그인이 필요해요" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.head}`}>
        <span className={styles.kicker}>PROFILE STUDIO</span>
        <h1 className={styles.title}>프로필 · 인증 · 회피</h1>
        <p className={styles.lede}>나를 더 잘 보여주고, 신뢰는 더하고, 불편한 만남은 피해요.</p>
      </header>

      <div className={`container ${styles.tabsWrap}`}>
        <Tabs
          tabs={[
            { value: 'profile', label: '사전 프로필', icon: '🪞' },
            { value: 'trust', label: '신상 인증', icon: '🛡️' },
            { value: 'avoid', label: '지인 회피', icon: '🙈' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
        />
      </div>

      <div className={`container ${styles.body}`} key={tab}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'trust' && <TrustTab />}
        {tab === 'avoid' && <AvoidTab />}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// 사전 프로필
// ──────────────────────────────────────────────
function ProfileTab() {
  const user = useAuthStore((s) => s.user)!
  const toast = useToast()
  const mutation = useUpdateProfile()

  const initial = user.profile ?? {}
  const [oneLiner, setOneLiner] = useState(initial.oneLiner ?? '')
  const [lookingFor, setLookingFor] = useState(initial.lookingFor ?? '')
  const [idealType, setIdealType] = useState<string[]>(initial.idealType ?? [])
  const [idealDraft, setIdealDraft] = useState('')
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(
    initial.prompts && initial.prompts.length > 0 ? initial.prompts : [{ q: '', a: '' }],
  )

  const addIdeal = () => {
    const v = idealDraft.trim()
    if (!v || idealType.includes(v) || idealType.length >= 8) return
    setIdealType((prev) => [...prev, v])
    setIdealDraft('')
  }

  const setPrompt = (i: number, patch: Partial<ProfilePrompt>) =>
    setPrompts((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const save = async () => {
    const cleanedPrompts = prompts
      .map((p) => ({ q: p.q.trim(), a: p.a.trim() }))
      .filter((p) => p.q && p.a)
    const dto: PreProfileDto = {
      oneLiner: oneLiner.trim() || undefined,
      lookingFor: lookingFor.trim() || undefined,
      idealType: idealType.length ? idealType : undefined,
      prompts: cleanedPrompts.length ? cleanedPrompts : undefined,
    }
    try {
      await mutation.mutateAsync(dto)
      toast.show('프로필을 저장했어요', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  return (
    <Card padding="lg" className={styles.tabCard}>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>01</span>
          <h2 className={styles.h2}>한 줄 소개</h2>
        </div>
        <Input
          placeholder="예: 주말엔 산, 평일엔 와인 한 잔"
          value={oneLiner}
          maxLength={120}
          onChange={(e) => setOneLiner(e.target.value)}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>02</span>
          <div>
            <h2 className={styles.h2}>이상형 키워드</h2>
            <p className={styles.muted}>최대 8개까지. 매칭과 대화 소재로 쓰여요.</p>
          </div>
        </div>
        {idealType.length > 0 && (
          <div className={styles.chipRow}>
            {idealType.map((kw) => (
              <Chip
                key={kw}
                selected
                onClick={() => setIdealType((p) => p.filter((x) => x !== kw))}
              >
                {kw}
                <span className={styles.chipRemove} aria-hidden="true">
                  ✕
                </span>
              </Chip>
            ))}
          </div>
        )}
        <div className={styles.inlineForm}>
          <Input
            placeholder="키워드 입력 후 추가"
            value={idealDraft}
            maxLength={20}
            onChange={(e) => setIdealDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addIdeal()
              }
            }}
          />
          <Button variant="soft" onClick={addIdeal} disabled={idealType.length >= 8}>
            추가
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>03</span>
          <h2 className={styles.h2}>찾는 관계</h2>
        </div>
        <Input
          placeholder="예: 취미를 함께할 친구, 진지한 만남"
          value={lookingFor}
          maxLength={200}
          onChange={(e) => setLookingFor(e.target.value)}
        />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>04</span>
          <div>
            <h2 className={styles.h2}>대화 프롬프트</h2>
            <p className={styles.muted}>질문과 답을 미리 채워두면 첫 대화가 쉬워져요.</p>
          </div>
        </div>
        <div className={styles.promptList}>
          {prompts.map((p, i) => (
            <div key={i} className={styles.promptItem}>
              <span className={styles.promptBadge} aria-hidden="true">
                Q{i + 1}
              </span>
              <Input
                placeholder="질문 (예: 인생 영화는?)"
                value={p.q}
                maxLength={60}
                onChange={(e) => setPrompt(i, { q: e.target.value })}
              />
              <textarea
                className={styles.textarea}
                placeholder="나의 답"
                value={p.a}
                maxLength={300}
                rows={2}
                onChange={(e) => setPrompt(i, { a: e.target.value })}
              />
              {prompts.length > 1 && (
                <button
                  type="button"
                  className={styles.removeLink}
                  onClick={() => setPrompts((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
        {prompts.length < 6 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPrompts((prev) => [...prev, { q: '', a: '' }])}
          >
            + 프롬프트 추가
          </Button>
        )}
      </section>

      <div className={styles.saveBar}>
        <Button variant="primary" onClick={save} isLoading={mutation.isPending}>
          프로필 저장
        </Button>
      </div>
    </Card>
  )
}

// ──────────────────────────────────────────────
// 신상 인증
// ──────────────────────────────────────────────
function TrustTab() {
  const user = useAuthStore((s) => s.user)!
  const toast = useToast()
  const updateTrust = useUpdateTrust()
  const verify = useVerifyField()

  const verified = useMemo(() => new Set(user.verifiedFields ?? []), [user.verifiedFields])
  const [occupation, setOccupation] = useState(user.occupation ?? '')
  const [company, setCompany] = useState(user.company ?? '')
  const [incomeBand, setIncomeBand] = useState<IncomeBand | ''>(user.incomeBand ?? '')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | ''>(user.maritalStatus ?? '')
  const [education, setEducation] = useState<Education | ''>(user.education ?? '')
  const [visibility, setVisibility] = useState<
    Partial<Record<VerifiableDetailField, FieldVisibility>>
  >(user.visibility ?? {})

  const setVis = (key: VerifiableDetailField, v: FieldVisibility) =>
    setVisibility((prev) => ({ ...prev, [key]: v }))

  const saveDetails = async () => {
    try {
      await updateTrust.mutateAsync({
        occupation: occupation.trim() || null,
        company: company.trim() || null,
        incomeBand: incomeBand || null,
        maritalStatus: maritalStatus || null,
        education: education || null,
        visibility,
      })
      toast.show('신상 정보를 저장했어요', 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const runVerify = async (field: VerificationField) => {
    try {
      await verify.mutateAsync({
        field,
        method: VERIFY_METHODS[field],
        incomeBand: field === 'income' ? incomeBand || undefined : undefined,
      })
      toast.show(`${VERIFICATION_FIELD_LABEL[field]} 완료`, 'success')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const verifiedCount = verified.size

  return (
    <div className={styles.stack}>
      <Card padding="lg" className={styles.trustShelf}>
        <div className={styles.shelfHead}>
          <div>
            <span className={styles.kickerGold}>VERIFIED</span>
            <h2 className={styles.h2}>내 인증 배지</h2>
            <p className={styles.muted}>인증한 항목은 골드 배지로 다른 사람에게 보여요.</p>
          </div>
          <span className={styles.shelfCount} aria-hidden="true">
            <strong>{verifiedCount}</strong>개 인증됨
          </span>
        </div>
        <div className={styles.badgeArea}>
          <VerifiedBadges fields={[...verified]} size="md" showEmpty />
        </div>
        <p className={styles.privacyNote}>
          <span className={styles.noteIcon} aria-hidden="true">
            🔒
          </span>
          <span>
            원본 서류는 저장하지 않고 <strong>인증 배지만</strong> 남깁니다. 소득은 구간만 노출돼요.
          </span>
        </p>
      </Card>

      <Card padding="lg" className={styles.tabCard}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>🛡️</span>
          <div>
            <h2 className={styles.h2}>신상 정보 · 공개범위</h2>
            <p className={styles.muted}>
              항목별로 입력하고 “인증하기”를 누르세요. 공개범위는 필드마다 따로 정할 수 있어요.
            </p>
          </div>
        </div>

        <div className={styles.trustList}>
          <TrustRow
            label="직업"
            verified={verified.has('job')}
            field="job"
            onVerify={() => runVerify('job')}
            verifying={verify.isPending}
            visKey="occupation"
            visibility={visibility}
            onVis={setVis}
          >
            <Input
              placeholder="예: 프로덕트 디자이너"
              value={occupation}
              maxLength={40}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </TrustRow>

          <TrustRow
            label="회사 (재직)"
            verified={verified.has('company')}
            field="company"
            onVerify={() => runVerify('company')}
            verifying={verify.isPending}
            visKey="company"
            visibility={visibility}
            onVis={setVis}
          >
            <Input
              placeholder="회사명"
              value={company}
              maxLength={60}
              onChange={(e) => setCompany(e.target.value)}
            />
          </TrustRow>

          <TrustRow
            label="소득 구간"
            verified={verified.has('income')}
            field="income"
            onVerify={() => runVerify('income')}
            verifying={verify.isPending}
            visKey="income"
            visibility={visibility}
            onVis={setVis}
          >
            <select
              className={styles.select}
              value={incomeBand}
              onChange={(e) => setIncomeBand(e.target.value as IncomeBand | '')}
            >
              <option value="">선택 안 함</option>
              {INCOME_BANDS.map((b) => (
                <option key={b} value={b}>
                  {INCOME_BAND_LABEL[b]}
                </option>
              ))}
            </select>
          </TrustRow>

          <TrustRow
            label="결혼 여부"
            verified={verified.has('marital')}
            field="marital"
            onVerify={() => runVerify('marital')}
            verifying={verify.isPending}
            visKey="marital"
            visibility={visibility}
            onVis={setVis}
          >
            <select
              className={styles.select}
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus | '')}
            >
              <option value="">선택 안 함</option>
              {MARITAL_STATUSES.map((m) => (
                <option key={m} value={m}>
                  {MARITAL_STATUS_LABEL[m]}
                </option>
              ))}
            </select>
          </TrustRow>

          <TrustRow
            label="학력"
            verified={verified.has('education')}
            field="education"
            onVerify={() => runVerify('education')}
            verifying={verify.isPending}
            visKey="education"
            visibility={visibility}
            onVis={setVis}
          >
            <select
              className={styles.select}
              value={education}
              onChange={(e) => setEducation(e.target.value as Education | '')}
            >
              <option value="">선택 안 함</option>
              {EDUCATIONS.map((ed) => (
                <option key={ed} value={ed}>
                  {EDUCATION_LABEL[ed]}
                </option>
              ))}
            </select>
          </TrustRow>

          <div
            className={`${styles.identityRow} ${verified.has('identity') ? styles.identityDone : ''}`}
          >
            <span className={styles.identityIcon} aria-hidden="true">
              {verified.has('identity') ? '✓' : '🪪'}
            </span>
            <div className={styles.identityCopy}>
              <strong>본인(성인) 인증</strong>
              <p className={styles.muted}>휴대폰 본인인증으로 한 번에 끝나요.</p>
            </div>
            {verified.has('identity') ? (
              <Badge tone="gold" size="md">
                ✓ {VERIFICATION_FIELD_LABEL.identity}
              </Badge>
            ) : (
              <Button
                variant="gold"
                size="sm"
                onClick={() => runVerify('identity')}
                isLoading={verify.isPending}
              >
                인증하기
              </Button>
            )}
          </div>
        </div>

        <div className={styles.saveBar}>
          <Button variant="primary" onClick={saveDetails} isLoading={updateTrust.isPending}>
            신상 정보 저장
          </Button>
        </div>
      </Card>
    </div>
  )
}

interface TrustRowProps {
  label: string
  field: VerificationField
  verified: boolean
  verifying: boolean
  visKey: VerifiableDetailField
  visibility: Partial<Record<VerifiableDetailField, FieldVisibility>>
  onVerify: () => void
  onVis: (key: VerifiableDetailField, v: FieldVisibility) => void
  children: ReactNode
}

function TrustRow({
  label,
  field,
  verified,
  verifying,
  visKey,
  visibility,
  onVerify,
  onVis,
  children,
}: TrustRowProps) {
  return (
    <div className={`${styles.trustRow} ${verified ? styles.trustRowDone : ''}`}>
      <div className={styles.trustHead}>
        <span className={styles.trustLabel}>{label}</span>
        {verified ? (
          <Badge tone="gold">✓ {VERIFICATION_FIELD_LABEL[field]}</Badge>
        ) : (
          <Button variant="soft" size="sm" onClick={onVerify} isLoading={verifying}>
            인증하기
          </Button>
        )}
      </div>
      <div className={styles.trustBody}>{children}</div>
      <label className={styles.visRow}>
        <span className={styles.visLabel}>
          <span className={styles.visEye} aria-hidden="true">
            👁
          </span>
          공개범위
        </span>
        <select
          className={styles.selectSm}
          value={visibility[visKey] ?? 'matched'}
          onChange={(e) => onVis(visKey, e.target.value as FieldVisibility)}
        >
          {(Object.keys(VISIBILITY_LABEL) as FieldVisibility[]).map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABEL[v]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

// ──────────────────────────────────────────────
// 지인 회피
// ──────────────────────────────────────────────
function AvoidTab() {
  const user = useAuthStore((s) => s.user)!
  const toast = useToast()
  const { data: contacts, isLoading } = useAvoidContacts()
  const addContacts = useAddAvoidContacts()
  const removeContact = useRemoveAvoidContact()
  const updateContact = useUpdateContact()
  const updateAvoidPrefs = useUpdateAvoidPrefs()
  const updatePrivacy = useUpdatePrivacy()

  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('')
  const [avoidSameCompany, setAvoidSameCompany] = useState(() => user.avoidSameCompany ?? false)
  const [showLikesReceived, setShowLikesReceived] = useState(() => user.showLikesReceived ?? true)
  const [joinPopularityRanking, setJoinPopularityRanking] = useState(
    () => user.joinPopularityRanking ?? true,
  )

  useEffect(() => {
    setAvoidSameCompany(user.avoidSameCompany ?? false)
    setShowLikesReceived(user.showLikesReceived ?? true)
    setJoinPopularityRanking(user.joinPopularityRanking ?? true)
  }, [user.avoidSameCompany, user.showLikesReceived, user.joinPopularityRanking])

  const add = async () => {
    const v = phone.trim()
    if (v.length < 9) {
      toast.show('전화번호를 정확히 입력해 주세요', 'error')
      return
    }
    try {
      const res = await addContacts.mutateAsync({ phones: [v], label: label.trim() || undefined })
      toast.show(res.added > 0 ? '회피 연락처에 추가했어요' : '이미 등록된 번호예요', 'success')
      setPhone('')
      setLabel('')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    }
  }

  const toggleSameCompany = (next: boolean) => {
    setAvoidSameCompany(next)
    updateAvoidPrefs.mutate(
      { avoidSameCompany: next },
      {
        onSuccess: () => toast.show('설정을 저장했어요', 'success'),
        onError: (e) => {
          setAvoidSameCompany(!next)
          toast.show((e as Error).message, 'error')
        },
      },
    )
  }

  return (
    <div className={styles.stack}>
      <Card padding="lg" className={styles.tabCard}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>🙈</span>
          <div>
            <h2 className={styles.h2}>회피 연락처 추가</h2>
            <p className={styles.muted}>아는 사람과 마주치지 않도록 미리 일러둘 수 있어요.</p>
          </div>
        </div>
        <p className={styles.privacyNote}>
          <span className={styles.noteIcon} aria-hidden="true">
            🔒
          </span>
          <span>
            원본 번호는 저장하지 않고 <strong>해시로만</strong> 대조해요. 같은 모임에 등록한 사람이
            있으면 미리 알려드려요.
          </span>
        </p>
        <div className={styles.avoidForm}>
          <Input
            label="전화번호"
            placeholder="010-1234-5678"
            inputMode="tel"
            value={phone}
            maxLength={20}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="메모 (선택)"
            placeholder="예: 전 직장 동료"
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button variant="primary" onClick={add} isLoading={addContacts.isPending}>
            추가
          </Button>
        </div>
      </Card>

      <Card padding="lg" className={styles.tabCard}>
        <label className={styles.toggleRow}>
          <div className={styles.toggleCopy}>
            <strong>같은 회사 사람 피하기</strong>
            <p className={styles.muted}>
              {user.company
                ? `“${user.company}” 소속과 같은 모임이면 경고해요.`
                : '먼저 신상 인증 탭에서 회사를 입력하면 사용할 수 있어요.'}
            </p>
          </div>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={avoidSameCompany}
            disabled={!user.company}
            onChange={(e) => toggleSameCompany(e.target.checked)}
          />
        </label>
      </Card>

      <Card padding="lg" className={styles.tabCard}>
        <div className={styles.listHead}>
          <h2 className={styles.h2}>내 회피 목록</h2>
          {contacts && contacts.length > 0 && (
            <span className={styles.listCount}>{contacts.length}명</span>
          )}
        </div>
        {isLoading ? (
          <Loading />
        ) : !contacts || contacts.length === 0 ? (
          <div className={styles.avoidEmpty}>
            <span className={styles.avoidEmptyIcon} aria-hidden="true">
              🙈
            </span>
            <p>아직 등록한 회피 연락처가 없어요. 위에서 한 명씩 더해 보세요.</p>
          </div>
        ) : (
          <div className={styles.avoidList}>
            {contacts.map((c) => (
              <div key={c.id} className={styles.avoidItem}>
                <span className={styles.avoidAvatar} aria-hidden="true">
                  {(c.label || '?').trim().slice(0, 1).toUpperCase()}
                </span>
                <div className={styles.avoidMeta}>
                  <strong>{c.label || '메모 없음'}</strong>
                  <span className={styles.hashHint}>
                    <span className={styles.hashDot} aria-hidden="true" />
                    해시로만 저장됨
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    removeContact.mutate(c.id, {
                      onSuccess: () => toast.show('삭제했어요', 'success'),
                      onError: (e) => toast.show((e as Error).message, 'error'),
                    })
                  }
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="lg" className={styles.tabCard}>
        <label className={styles.toggleRow}>
          <div className={styles.toggleCopy}>
            <strong>매칭된 상대에게 연락처 공유</strong>
            <p className={styles.muted}>상호 동의한 매칭 상대에게만 공개돼요.</p>
          </div>
          <input
            type="checkbox"
            className={styles.checkbox}
            defaultChecked={user.shareContact}
            onChange={(e) =>
              updateContact.mutate(
                { shareContact: e.target.checked },
                {
                  onSuccess: () => toast.show('설정을 저장했어요', 'success'),
                  onError: (err) => toast.show((err as Error).message, 'error'),
                },
              )
            }
          />
        </label>
      </Card>

      <Card padding="lg" className={styles.tabCard}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionIndex}>👀</span>
          <div>
            <h2 className={styles.h2}>민감 정보 공개</h2>
            <p className={styles.muted}>받은 호감 수처럼 민감한 정보를 어디까지 보일지 골라요.</p>
          </div>
        </div>
        <label className={styles.toggleRow}>
          <div className={styles.toggleCopy}>
            <strong>받은 호감 수 공개</strong>
            <p className={styles.muted}>끄면 ‘오늘의 인기’에 뽑혀도 받은 호감 수는 숨겨져요.</p>
          </div>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={showLikesReceived}
            onChange={(e) => {
              const next = e.target.checked
              setShowLikesReceived(next)
              updatePrivacy.mutate(
                { showLikesReceived: next },
                {
                  onSuccess: () => toast.show('설정을 저장했어요', 'success'),
                  onError: (err) => {
                    setShowLikesReceived(!next)
                    toast.show((err as Error).message, 'error')
                  },
                },
              )
            }}
          />
        </label>
        <label className={styles.toggleRow}>
          <div className={styles.toggleCopy}>
            <strong>오늘의 인기남/인기녀 선정 참여</strong>
            <p className={styles.muted}>끄면 종료 후 인기 멤버 공개 대상에서 빠져요.</p>
          </div>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={joinPopularityRanking}
            onChange={(e) => {
              const next = e.target.checked
              setJoinPopularityRanking(next)
              updatePrivacy.mutate(
                { joinPopularityRanking: next },
                {
                  onSuccess: () => toast.show('설정을 저장했어요', 'success'),
                  onError: (err) => {
                    setJoinPopularityRanking(!next)
                    toast.show((err as Error).message, 'error')
                  },
                },
              )
            }}
          />
        </label>
      </Card>
    </div>
  )
}
