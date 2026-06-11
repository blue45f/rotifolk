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
  /** 첨부 이미지(data URL) — 없으면 null. */
  imageData?: string | null
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
  /**
   * 삭제 플레이스홀더 — 답글이 남아 있는 댓글을 지우면 스레드 유지를 위해
   * 본문을 비운 채 이 플래그만 켜져 내려온다. UI는 안내 문구로 대체 렌더한다.
   */
  deleted?: boolean
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
