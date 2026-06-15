import { api } from '@services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CommunityPost,
  CommunityPostDetail,
  CommunityPostQueryDto,
  CreateCommunityCommentDto,
  CreateCommunityPostDto,
  CreateReportDto,
  Paginated,
  UpdateCommunityCommentDto,
  UpdateCommunityPostDto,
} from '@rotifolk/shared'

export const communityKeys = {
  all: ['community'] as const,
  posts: (query: Partial<CommunityPostQueryDto>) => [...communityKeys.all, 'posts', query] as const,
  post: (postId: string | null | undefined) =>
    [...communityKeys.all, 'post', postId ?? 'none'] as const,
}

function buildSearchParams(query: Partial<CommunityPostQueryDto>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function useCommunityPosts(query: Partial<CommunityPostQueryDto>) {
  return useQuery({
    queryKey: communityKeys.posts(query),
    queryFn: () => {
      const params = buildSearchParams(query)
      return params
        ? api.get<Paginated<CommunityPost>>(`community/posts?${params}`)
        : api.get<Paginated<CommunityPost>>('community/posts')
    },
  })
}

export function useCommunityPost(postId: string | null | undefined) {
  return useQuery({
    queryKey: communityKeys.post(postId),
    queryFn: () => api.get<CommunityPostDetail>(`community/posts/${postId}`),
    enabled: !!postId,
  })
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCommunityPostDto) => api.post<CommunityPost>('community/posts', dto),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all })
      queryClient.setQueryData(communityKeys.post(post.id), { ...post, comments: [] })
    },
  })
}

export function useCreateCommunityComment(postId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCommunityCommentDto) =>
      api.post(`community/posts/${postId}/comments`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all })
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}

export function useUpdateCommunityPost(postId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateCommunityPostDto) =>
      api.patch<CommunityPost>(`community/posts/${postId}`, dto),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all })
      queryClient.setQueryData<CommunityPostDetail | undefined>(
        communityKeys.post(postId),
        (current) => (current ? { ...current, ...post } : current)
      )
    },
  })
}

export function useDeleteCommunityPost(postId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<{ ok: true }>(`community/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all })
      queryClient.removeQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}

export function useUpdateCommunityComment(postId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { commentId: string; dto: UpdateCommunityCommentDto }) =>
      api.patch(`community/posts/${postId}/comments/${input.commentId}`, input.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all })
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}

export function useDeleteCommunityComment(postId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) =>
      api.delete<{ ok: true }>(`community/posts/${postId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all })
      queryClient.invalidateQueries({ queryKey: communityKeys.post(postId) })
    },
  })
}

export function useReportCommunityContent() {
  return useMutation({
    mutationFn: (dto: CreateReportDto) => api.post<{ id: string; status: string }>('reports', dto),
  })
}
