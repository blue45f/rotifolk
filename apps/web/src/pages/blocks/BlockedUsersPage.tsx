import { useConfirm } from '@components/feedback/Confirm/useConfirm'
import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Button } from '@components/ui/Button/Button'
import { Icon } from '@components/ui/Icon/Icon'
import { Input } from '@components/ui/Input/Input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './BlockedUsers.module.css'

import { api } from '@/infrastructure/api'

interface BlockedUser {
  id: string
  nickname: string
  avatarId: string | null
  avatarImage?: string | null
  blockedAt?: string
  reason?: string | null
}

interface PhoneBlock {
  id: string
  label?: string | null
  createdAt: string
}

interface CandidateUser {
  id: string
  nickname: string
  avatarId: string | null
}

function formatPhoneForSubmit(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  const normalized = digits.startsWith('82') ? `0${digits.slice(2)}` : digits
  if (normalized.length < 9 || normalized.length > 20) return null
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`
  }
  if (normalized.length === 10 && normalized.startsWith('02')) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 6)}-${normalized.slice(6)}`
  }
  return normalized
}

function formatBlockDate(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

export default function BlockedUsersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  const [activeTab, setActiveTab] = useState<'users' | 'phones'>('users')
  const [q, setQ] = useState('')

  // 1. 사용자 차단 데이터
  const { data: blockedUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => api.get<BlockedUser[]>('blocks'),
  })

  // 2. 차단 대상 후보자 목록
  const { data: candidates } = useQuery({
    queryKey: ['blocks', 'candidates'],
    queryFn: () => api.get<CandidateUser[]>('blocks/candidates'),
    enabled: activeTab === 'users',
  })

  // 3. 연락처 차단 목록 데이터
  const { data: phoneBlocks, isLoading: isLoadingPhones } = useQuery({
    queryKey: ['blocks', 'phones'],
    queryFn: () => api.get<PhoneBlock[]>('blocks/phones'),
    enabled: activeTab === 'phones',
  })

  // 사용자 차단 등록 모달 상태
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [userReason, setUserReason] = useState('사적인 대화 강요 및 불쾌감 조성')
  const [customUserReason, setCustomUserReason] = useState('')

  // 연락처 차단 개별 등록 상태
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneReason, setPhoneReason] = useState('')

  // 연락처 일괄 대량 차단 모달 상태
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
  const [bulkPhonesText, setBulkPhonesText] = useState('')
  const [bulkReason, setBulkReason] = useState('지인 회피')

  // Mutations
  const unblockUser = useMutation({
    mutationFn: (userId: string) => api.delete(`blocks/${userId}`),
    onSuccess: () => {
      toast.show('차단을 해제했어요', 'success')
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const blockUser = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      api.post(`blocks/${userId}`, { reason }),
    onSuccess: () => {
      toast.show('사용자를 차단했어요', 'success')
      setIsUserModalOpen(false)
      setSelectedCandidateId('')
      setCustomUserReason('')
      qc.invalidateQueries({ queryKey: ['blocks'] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const blockPhone = useMutation({
    mutationFn: (body: { phone: string; reason?: string }) => api.post('blocks/phones', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocks', 'phones'] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  const unblockPhone = useMutation({
    mutationFn: (id: string) => api.delete(`blocks/phones/${id}`),
    onSuccess: () => {
      toast.show('연락처 차단을 해제했어요', 'success')
      qc.invalidateQueries({ queryKey: ['blocks', 'phones'] })
    },
    onError: (e) => toast.show((e as Error).message, 'error'),
  })

  // 핸들러
  const handleBlockUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidateId) {
      toast.show('차단할 사용자를 선택해주세요', 'warning')
      return
    }
    const finalReason = userReason === 'custom' ? customUserReason.trim() : userReason
    if (userReason === 'custom' && !finalReason) {
      toast.show('사유를 직접 입력해주세요', 'warning')
      return
    }
    blockUser.mutate({ userId: selectedCandidateId, reason: finalReason })
  }

  const handleSinglePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = formatPhoneForSubmit(phoneInput)
    if (!cleaned) {
      toast.show('올바른 전화번호를 입력해주세요', 'warning')
      return
    }
    blockPhone.mutate(
      { phone: cleaned, reason: phoneReason.trim() || undefined },
      {
        onSuccess: () => {
          toast.show('전화번호가 차단 목록에 등록되었습니다.', 'success')
          setPhoneInput('')
          setPhoneReason('')
        },
      }
    )
  }

  const handleBulkPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rawLines = bulkPhonesText.split(/[\n,;]/)
    const validPhones = Array.from(
      new Set(rawLines.map(formatPhoneForSubmit).filter((phone): phone is string => !!phone))
    )

    if (validPhones.length === 0) {
      toast.show('유효한 전화번호가 발견되지 않았습니다.', 'warning')
      return
    }

    try {
      await Promise.all(
        validPhones.map((phone) =>
          api.post('blocks/phones', { phone, reason: bulkReason.trim() || undefined })
        )
      )
      toast.show(`${validPhones.length}개의 전화번호를 차단 등록했습니다.`, 'success')
      setBulkPhonesText('')
      setIsPhoneModalOpen(false)
      qc.invalidateQueries({ queryKey: ['blocks', 'phones'] })
    } catch (err) {
      toast.show((err as Error).message, 'error')
    }
  }

  const isLoading = activeTab === 'users' ? isLoadingUsers : isLoadingPhones
  const activeTabLabel = activeTab === 'users' ? '차단한 사용자' : '연락처 기반 지인 차단'
  const blockedItems = blockedUsers ?? []
  const normalizedQuery = q.trim().toLowerCase()
  const filteredBlockedUsers = normalizedQuery
    ? blockedItems.filter((u) => u.nickname.toLowerCase().includes(normalizedQuery))
    : blockedItems

  if (isLoading) return <Loading />

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.kicker}>
          <Icon name="shield" />
          안심 매칭
        </p>
        <h1>차단 목록 관리</h1>
        <p className={styles.muted}>
          원치 않는 사용자를 매칭과 소셜링에서 격리하고, 지인 회피를 직접 설정하세요.
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="차단 관리 유형">
        <button
          id="blocked-users-tab-users"
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          aria-controls="blocked-users-panel-users"
          className={`${styles.tabButton} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => {
            setActiveTab('users')
            setQ('')
          }}
        >
          차단한 사용자
        </button>
        <button
          id="blocked-users-tab-phones"
          type="button"
          role="tab"
          aria-selected={activeTab === 'phones'}
          aria-controls="blocked-users-panel-phones"
          className={`${styles.tabButton} ${activeTab === 'phones' ? styles.activeTab : ''}`}
          onClick={() => {
            setActiveTab('phones')
            setQ('')
          }}
        >
          연락처 기반 지인 차단
        </button>
      </div>

      {activeTab === 'users' ? (
        <section
          id="blocked-users-panel-users"
          role="tabpanel"
          aria-labelledby="blocked-users-tab-users"
        >
          <div className={styles.controls}>
            <div className={styles.searchWrapper}>
              <Input
                type="search"
                aria-label="차단 유저 닉네임 검색"
                placeholder="차단 유저 닉네임 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                leftIcon={<Icon name="search" />}
              />
            </div>
            <Button variant="primary" onClick={() => setIsUserModalOpen(true)}>
              <Icon name="plus" />
              사용자 직접 차단
            </Button>
          </div>

          {blockedItems.length === 0 ? (
            <EmptyState
              emoji="🌙"
              title="차단한 사용자가 없어요"
              description="[사용자 직접 차단] 버튼 또는 호스트 프로필의 (⋯) 메뉴에서 차단할 수 있습니다."
            />
          ) : filteredBlockedUsers.length === 0 ? (
            <p className={styles.emptyFilter} role="status">
              "{q.trim()}"와 일치하는 차단 사용자가 없어요.
            </p>
          ) : (
            <ul className={styles.list}>
              {filteredBlockedUsers.map((u) => (
                <li key={u.id} className={styles.row}>
                  <Link to={`/hosts/${u.id}`} className={styles.identity}>
                    <Avatar
                      size="md"
                      hue="var(--brand-apricot-600)"
                      pattern="gradient"
                      emoji={u.nickname[0]}
                      imageSrc={u.avatarImage ?? null}
                      ring="soft"
                    />
                    <div className={styles.body}>
                      <strong>{u.nickname}</strong>
                      {u.reason && <span className={styles.reasonBadge}>{u.reason}</span>}
                      {u.blockedAt && (
                        <time className={styles.rowMeta}>
                          <Icon name="clock" />
                          차단일 {formatBlockDate(u.blockedAt)}
                        </time>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={async () => {
                      if (await confirm({ title: '차단을 해제할까요?', confirmLabel: '해제' }))
                        unblockUser.mutate(u.id)
                    }}
                    disabled={unblockUser.isPending}
                  >
                    해제
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section
          id="blocked-users-panel-phones"
          role="tabpanel"
          aria-labelledby="blocked-users-tab-phones"
          aria-label={activeTabLabel}
        >
          <p className={styles.privacyNote}>
            <Icon name="shield" />
            <span>
              <strong>원본 번호는 저장하지 않아요</strong>
              입력한 번호는 서버에서 해시로 바뀐 뒤 매칭 회피 대조에만 사용됩니다.
            </span>
          </p>

          <form className={styles.phoneBlockForm} onSubmit={handleSinglePhoneSubmit}>
            <h2 className={styles.formTitle}>지인 연락처 개별 등록</h2>
            <div className={styles.formGrid}>
              <Input
                label="전화번호"
                placeholder="예: 010-1234-5678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                inputMode="tel"
                autoComplete="off"
                required
              />
              <Input
                label="회피 메모"
                placeholder="예: 전 직장 동료, 동창 등"
                value={phoneReason}
                onChange={(e) => setPhoneReason(e.target.value)}
              />
            </div>
            <div className={styles.btnGroup}>
              <Button type="button" variant="outline" onClick={() => setIsPhoneModalOpen(true)}>
                연락처 대량 추가
              </Button>
              <Button type="submit" variant="primary" disabled={blockPhone.isPending}>
                등록하기
              </Button>
            </div>
          </form>

          <h2 className={styles.listTitle}>
            회피 등록된 연락처 <span className={styles.count}>{phoneBlocks?.length ?? 0}</span>
          </h2>

          {!phoneBlocks || phoneBlocks.length === 0 ? (
            <EmptyState
              emoji="📱"
              title="등록된 지인 연락처가 없습니다"
              description="이 번호로 가입한 회원은 같은 소셜 모임 및 매칭 카드 목록에서 자동으로 필터링됩니다."
            />
          ) : (
            <ul className={styles.phoneList}>
              {phoneBlocks.map((pb) => (
                <li key={pb.id} className={styles.phoneRow}>
                  <div className={styles.phoneInfo}>
                    <span className={styles.phoneLabel}>{pb.label || '메모 없는 회피 연락처'}</span>
                    <span className={styles.phoneMeta}>
                      <span className={styles.pillStatus}>해시 등록됨</span>
                      <time>{formatBlockDate(pb.createdAt)}</time>
                    </span>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={async () => {
                      if (
                        await confirm({ title: '연락처 회피를 해제할까요?', confirmLabel: '해제' })
                      )
                        unblockPhone.mutate(pb.id)
                    }}
                    disabled={unblockPhone.isPending}
                  >
                    해제
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isUserModalOpen && (
        <div className={styles.modalContainer}>
          <button
            className={styles.modalOverlay}
            type="button"
            onClick={() => setIsUserModalOpen(false)}
            aria-label="배경 닫기"
          />
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-user-title"
          >
            <div className={styles.modalHead}>
              <h2 id="block-user-title">사용자 차단 직접 추가</h2>
              <button
                className={styles.closeButton}
                type="button"
                aria-label="닫기"
                onClick={() => setIsUserModalOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={handleBlockUserSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.field}>
                  <label htmlFor="blocked-user-candidate" className={styles.fieldLabel}>
                    차단 대상 사용자 선택
                  </label>
                  <select
                    id="blocked-user-candidate"
                    className={styles.selectInput}
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    required
                  >
                    <option value="">차단할 회원을 선택하세요</option>
                    {candidates?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nickname} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="blocked-user-reason" className={styles.fieldLabel}>
                    차단 사유
                  </label>
                  <select
                    id="blocked-user-reason"
                    className={styles.selectInput}
                    value={userReason}
                    onChange={(e) => setUserReason(e.target.value)}
                  >
                    <option value="사적인 대화 강요 및 불쾌감 조성">
                      사적인 대화 강요 및 불쾌감 조성
                    </option>
                    <option value="반복적인 약속 지각 및 노쇼">반복적인 약속 지각 및 노쇼</option>
                    <option value="언어폭력 및 비매너 행위">언어폭력 및 비매너 행위</option>
                    <option value="지인 매칭 기피 목적">지인 매칭 기피 목적</option>
                    <option value="custom">직접 사유 입력...</option>
                  </select>
                </div>

                {userReason === 'custom' && (
                  <Input
                    placeholder="사유를 입력해 주세요 (최대 50자)"
                    value={customUserReason}
                    onChange={(e) => setCustomUserReason(e.target.value.slice(0, 50))}
                    required
                  />
                )}

                <div className={styles.modalActions}>
                  <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                    취소
                  </Button>
                  <Button type="submit" variant="primary" disabled={blockUser.isPending}>
                    차단 추가
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPhoneModalOpen && (
        <div className={styles.modalContainer}>
          <button
            className={styles.modalOverlay}
            type="button"
            onClick={() => setIsPhoneModalOpen(false)}
            aria-label="배경 닫기"
          />
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-phone-title"
          >
            <div className={styles.modalHead}>
              <h2 id="bulk-phone-title">연락처 일괄 대량 차단</h2>
              <button
                className={styles.closeButton}
                type="button"
                aria-label="닫기"
                onClick={() => setIsPhoneModalOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={handleBulkPhoneSubmit}>
              <div className={styles.modalBody}>
                <p className={styles.modalHint}>
                  여러 번호를 쉼표(,), 세미콜론(;) 또는 개행(Enter)으로 구분하여 입력하세요.
                </p>
                <div className={styles.field}>
                  <label htmlFor="bulk-phone-list" className={styles.fieldLabel}>
                    전화번호 목록
                  </label>
                  <textarea
                    id="bulk-phone-list"
                    className={styles.bulkTextarea}
                    placeholder="010-1111-2222&#10;010-3333-4444, 010-5555-6666"
                    value={bulkPhonesText}
                    onChange={(e) => setBulkPhonesText(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="일괄 차단 사유 (선택)"
                  placeholder="예: 지인 회피 목적"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                />
                <div className={styles.modalActions}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPhoneModalOpen(false)}
                  >
                    취소
                  </Button>
                  <Button type="submit" variant="primary">
                    일괄 등록
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
