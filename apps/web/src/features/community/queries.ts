import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CommunityPost,
  CommunityPostDetail,
  CommunityPostQueryDto,
  CreateCommunityCommentDto,
  CreateCommunityPostDto,
  Paginated,
} from '@rotifolk/shared'
import { api } from '@services/api'

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
