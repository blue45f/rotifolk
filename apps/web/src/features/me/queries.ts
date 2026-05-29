import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AddAvoidContactsDto,
  AddAvoidPersonDto,
  AvoidPrefsDto,
  AvoidReason,
  PreProfileDto,
  PrivacyPrefsDto,
  UpdateContactDto,
  UpdateTrustProfileDto,
  VerificationField,
  VerifyFieldDto,
} from '@rotifolk/shared'
import { api } from '@services/api'
import { useAuthStore } from '@store/authStore'

/** 회피 연락처 (해시만 저장 — 원본 번호는 서버가 반환하지 않음) */
export interface AvoidContact {
  id: string
  label: string | null
  createdAt: string
}

/** 마주치기 싫은 사람 1명 (번호는 해시로만 저장, 원본 미보관) */
export interface AvoidPerson {
  id: string
  label: string | null
  createdAt: string
}

/** 같은 모임 내 회피/차단 대상 */
export interface AvoidMatch {
  userId: string
  nickname: string
  reasons: AvoidReason[]
}

export const meKeys = {
  avoidContacts: () => ['me', 'avoid-contacts'] as const,
  avoidPeople: () => ['me', 'avoid-people'] as const,
  avoidCheck: (partyId: string) => ['me', 'avoid-check', partyId] as const,
}

/** 사전 프로필 저장 → 로컬 user.profile 동기화 */
export function useUpdateProfile() {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (dto: PreProfileDto) => api.patch<{ profile: PreProfileDto }>('me/profile', dto),
    onSuccess: (res) => updateUser({ profile: res.profile }),
  })
}

/** 신상 정보 + 필드별 공개범위 저장 → 로컬 user 동기화 */
export function useUpdateTrust() {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (dto: UpdateTrustProfileDto) => api.patch<{ ok: true }>('me/trust', dto),
    onSuccess: (_res, dto) => {
      const patch: Parameters<typeof updateUser>[0] = {}
      if (dto.occupation !== undefined) patch.occupation = dto.occupation
      if (dto.company !== undefined) patch.company = dto.company
      if (dto.incomeBand !== undefined) patch.incomeBand = dto.incomeBand
      if (dto.maritalStatus !== undefined) patch.maritalStatus = dto.maritalStatus
      if (dto.education !== undefined) patch.education = dto.education
      if (dto.visibility !== undefined) patch.visibility = dto.visibility
      updateUser(patch)
    },
  })
}

/** 신상 인증 → 인증 배지(verifiedFields) 갱신 */
export function useVerifyField() {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (dto: VerifyFieldDto) =>
      api.post<{ verifiedFields: VerificationField[] }>('me/verify', dto),
    onSuccess: (res, dto) => {
      const patch: Parameters<typeof updateUser>[0] = { verifiedFields: res.verifiedFields }
      if (dto.field === 'income' && dto.incomeBand) patch.incomeBand = dto.incomeBand
      updateUser(patch)
    },
  })
}

/** 연결 채널(번호/카톡/인스타) 핸들 + 공개 동의 저장 → 로컬 user 동기화 */
export function useUpdateContact() {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (dto: UpdateContactDto) => api.patch<UpdateContactDto>('me/contact', dto),
    onSuccess: (_res, dto) => {
      const patch: Parameters<typeof updateUser>[0] = {}
      if (dto.phone !== undefined) patch.phone = dto.phone
      if (dto.shareContact !== undefined) patch.shareContact = dto.shareContact
      if (dto.kakaoId !== undefined) patch.kakaoId = dto.kakaoId
      if (dto.shareKakao !== undefined) patch.shareKakao = dto.shareKakao
      if (dto.instagram !== undefined) patch.instagram = dto.instagram
      if (dto.shareInstagram !== undefined) patch.shareInstagram = dto.shareInstagram
      updateUser(patch)
    },
  })
}

/** 내 회피 연락처 목록 */
export function useAvoidContacts() {
  return useQuery({
    queryKey: meKeys.avoidContacts(),
    queryFn: () => api.get<AvoidContact[]>('me/avoid-contacts'),
  })
}

/** 회피 연락처 추가 (번호는 서버에서 해시 후 저장) */
export function useAddAvoidContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: AddAvoidContactsDto) => api.post<{ added: number }>('me/avoid-contacts', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.avoidContacts() }),
  })
}

/** 회피 연락처 삭제 */
export function useRemoveAvoidContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`me/avoid-contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.avoidContacts() }),
  })
}

/** 마주치기 싫은 사람 목록 (라벨/등록일만 — 번호는 해시로만 저장) */
export function useAvoidPeople() {
  return useQuery({
    queryKey: meKeys.avoidPeople(),
    queryFn: () => api.get<AvoidPerson[]>('me/avoid-people'),
  })
}

/** 마주치기 싫은 사람 1명 추가 (번호는 서버에서 해시 후 저장) */
export function useAddAvoidPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: AddAvoidPersonDto) => api.post<AvoidPerson>('me/avoid-people', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.avoidPeople() }),
  })
}

/** 마주치기 싫은 사람 삭제 */
export function useRemoveAvoidPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`me/avoid-people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKeys.avoidPeople() }),
  })
}

/** 회피 환경설정(같은 회사 자동 회피) 저장 → 로컬 user 동기화 */
export function useUpdateAvoidPrefs() {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (dto: AvoidPrefsDto) => api.patch<AvoidPrefsDto>('me/avoid-prefs', dto),
    onSuccess: (_res, dto) => {
      if (dto.avoidSameCompany !== undefined) updateUser({ avoidSameCompany: dto.avoidSameCompany })
    },
  })
}

/** 민감 정보 노출 설정(받은 호감 수·인기 랭킹) 저장 → 로컬 user 동기화 */
export function useUpdatePrivacy() {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: (dto: PrivacyPrefsDto) => api.patch<PrivacyPrefsDto>('me/privacy', dto),
    onSuccess: (_res, dto) => {
      const patch: Parameters<typeof updateUser>[0] = {}
      if (dto.showLikesReceived !== undefined) patch.showLikesReceived = dto.showLikesReceived
      if (dto.joinPopularityRanking !== undefined)
        patch.joinPopularityRanking = dto.joinPopularityRanking
      updateUser(patch)
    },
  })
}

/** 같은 모임에 회피/차단 대상이 있는지 검사 */
export function useAvoidCheck(partyId?: string) {
  return useQuery({
    queryKey: partyId ? meKeys.avoidCheck(partyId) : ['me', 'avoid-check', 'idle'],
    queryFn: () => api.get<AvoidMatch[]>(`me/avoid-check?partyId=${partyId}`),
    enabled: !!partyId,
  })
}
