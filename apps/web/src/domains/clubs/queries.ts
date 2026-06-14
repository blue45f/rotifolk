import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ClubComment,
  ClubDetail,
  ClubPost,
  ClubPostDetail,
  ClubQueryDto,
  ClubSummary,
  CreateClubCommentDto,
  CreateClubDto,
  CreateClubPostDto,
  Paginated,
} from '@rotifolk/shared'

import { ApiError, api } from '@/infrastructure/api'

export const clubKeys = {
  all: ['clubs'] as const,
  list: (query: Partial<ClubQueryDto>) => [...clubKeys.all, 'list', query] as const,
  detail: (clubId: string | null | undefined) =>
    [...clubKeys.all, 'detail', clubId ?? 'none'] as const,
  posts: (clubId: string | null | undefined) =>
    [...clubKeys.all, 'posts', clubId ?? 'none'] as const,
  post: (postId: string | null | undefined) => [...clubKeys.all, 'post', postId ?? 'none'] as const,
}

function buildSearchParams(query: Partial<ClubQueryDto>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function useClubs(query: Partial<ClubQueryDto>) {
  return useQuery({
    queryKey: clubKeys.list(query),
    queryFn: () => {
      const params = buildSearchParams(query)
      return params
        ? api.get<Paginated<ClubSummary>>(`clubs?${params}`)
        : api.get<Paginated<ClubSummary>>('clubs')
    },
  })
}

export function useClub(clubId: string | null | undefined) {
  return useQuery({
    queryKey: clubKeys.detail(clubId),
    queryFn: () => api.get<ClubDetail>(`clubs/${clubId}`),
    enabled: !!clubId,
  })
}

export function useCreateClub() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateClubDto) => api.post<ClubSummary>('clubs', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all })
    },
  })
}

export function useJoinClub(clubId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>(`clubs/${clubId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all })
    },
  })
}

export function useLeaveClub(clubId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ ok: true }>(`clubs/${clubId}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.all })
    },
  })
}

/** 비공개 클럽의 403(club_members_only)은 "가입 후 열람" 상태라 재시도하지 않는다. */
export function useClubPosts(clubId: string | null | undefined, canView: boolean) {
  return useQuery({
    queryKey: clubKeys.posts(clubId),
    queryFn: () => api.get<Paginated<ClubPost>>(`clubs/${clubId}/posts`),
    enabled: !!clubId && canView,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 403) && failureCount < 1,
  })
}

export function useClubPost(clubId: string | null | undefined, postId: string | null | undefined) {
  return useQuery({
    queryKey: clubKeys.post(postId),
    queryFn: () => api.get<ClubPostDetail>(`clubs/${clubId}/posts/${postId}`),
    enabled: !!clubId && !!postId,
  })
}

export function useCreateClubPost(clubId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateClubPostDto) => api.post<ClubPost>(`clubs/${clubId}/posts`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.posts(clubId) })
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
    },
  })
}

export function useDeleteClubPost(clubId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => api.delete<{ ok: true }>(`clubs/${clubId}/posts/${postId}`),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: clubKeys.posts(clubId) })
      queryClient.invalidateQueries({ queryKey: clubKeys.detail(clubId) })
      queryClient.removeQueries({ queryKey: clubKeys.post(postId) })
    },
  })
}

export function useCreateClubComment(
  clubId: string | null | undefined,
  postId: string | null | undefined
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateClubCommentDto) =>
      api.post<ClubComment>(`clubs/${clubId}/posts/${postId}/comments`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: clubKeys.posts(clubId) })
    },
  })
}

export function useDeleteClubComment(
  clubId: string | null | undefined,
  postId: string | null | undefined
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete<{ ok: true }>(`clubs/${clubId}/posts/${postId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.post(postId) })
      queryClient.invalidateQueries({ queryKey: clubKeys.posts(clubId) })
    },
  })
}
