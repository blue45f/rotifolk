import type { ID, ISODateString, Timestamps } from './common'

export type CommunityPostCategory = 'question' | 'after-party' | 'venue-tip' | 'match-review'

export const COMMUNITY_POST_CATEGORY_LABEL: Record<CommunityPostCategory, string> = {
  question: '질문',
  'after-party': '모임 후기',
  'venue-tip': '공간 팁',
  'match-review': '매칭 이야기',
}

export interface CommunityAuthor {
  id: ID
  nickname: string
  avatarId?: ID | null
  role: string
  isVerified: boolean
}

export interface CommunityPost extends Timestamps {
  id: ID
  title: string
  body: string
  category: CommunityPostCategory
  area?: string | null
  partyId?: ID | null
  partyTitle?: string | null
  tags: string[]
  commentCount: number
  lastCommentAt?: ISODateString | null
  author: CommunityAuthor
}

export interface CommunityComment extends Timestamps {
  id: ID
  postId: ID
  parentId?: ID | null
  body: string
  author: CommunityAuthor
  replies?: CommunityComment[]
}

export interface CommunityPostDetail extends CommunityPost {
  comments: CommunityComment[]
}

function findTopParentId(comment: CommunityComment, byId: Map<ID, CommunityComment>): ID | null {
  if (!comment.parentId) return null
  const parent = byId.get(comment.parentId)
  if (!parent) return null
  return parent.parentId ? (findTopParentId(parent, byId) ?? parent.parentId) : parent.id
}

export function buildCommunityCommentTree(
  comments: readonly CommunityComment[],
): CommunityComment[] {
  const byId = new Map<ID, CommunityComment>()
  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] })
  }

  const roots: CommunityComment[] = []

  for (const comment of comments) {
    const normalized = byId.get(comment.id)
    if (!normalized) continue

    const topParentId = findTopParentId(comment, byId)
    if (!topParentId) {
      roots.push(normalized)
      continue
    }

    const parent = byId.get(topParentId)
    if (!parent) {
      roots.push(normalized)
      continue
    }

    parent.replies = [
      ...(parent.replies ?? []),
      {
        ...normalized,
        parentId: parent.id,
        replies: [],
      },
    ]
  }

  return roots
}
