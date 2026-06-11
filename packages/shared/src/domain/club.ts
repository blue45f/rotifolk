import type { ID, ISODateString, Timestamps } from './common'
import type { CommunityAuthor, CommunityComment } from './community'

/**
 * 클럽(정기 모임 그룹) 도메인 — 카테고리별로 모이는 카페형 커뮤니티.
 * 파티가 "하룻밤의 로테이션"이라면 클럽은 그 로테이션이 반복되는 원(circle)이다.
 */

/** 클럽 카테고리 — 파티 카테고리에서 'custom'을 제외한 정규 분류만 허용. */
export const CLUB_CATEGORIES = [
  'wine',
  'natural-wine',
  'coffee',
  'tea',
  'whisky',
  'cocktail',
  'beer',
  'sake',
  'dessert',
] as const

export type ClubCategory = (typeof CLUB_CATEGORIES)[number]

export const CLUB_CATEGORY_LABEL: Record<ClubCategory, string> = {
  wine: '와인',
  'natural-wine': '내추럴 와인',
  coffee: '커피',
  tea: '차',
  whisky: '위스키',
  cocktail: '칵테일',
  beer: '맥주',
  sake: '사케',
  dessert: '디저트',
}

export type ClubVisibility = 'public' | 'private'

export const CLUB_VISIBILITY_LABEL: Record<ClubVisibility, string> = {
  public: '공개',
  private: '비공개',
}

export type ClubMemberRole = 'owner' | 'member'

export interface ClubMemberEntry {
  userId: ID
  nickname: string
  avatarId?: ID | null
  role: ClubMemberRole
  joinedAt: ISODateString
}

export interface ClubSummary extends Timestamps {
  id: ID
  name: string
  category: ClubCategory
  description: string
  visibility: ClubVisibility
  memberCount: number
  postCount: number
  owner: CommunityAuthor
  /** 요청자의 멤버십 — 비로그인/미가입이면 null. */
  myRole: ClubMemberRole | null
}

export interface ClubDetail extends ClubSummary {
  /** 비공개 클럽은 멤버에게만 명단을 노출한다(비멤버에겐 빈 배열). */
  members: ClubMemberEntry[]
  /** 게시판 열람 가능 여부 — 공개 클럽은 항상, 비공개 클럽은 멤버만. */
  canViewBoard: boolean
}

export type ClubPostStatus = 'open' | 'hidden' | 'removed'

export interface ClubPost extends Timestamps {
  id: ID
  clubId: ID
  title: string
  body: string
  /** 첨부 이미지(data URL) — 없으면 null. */
  imageData?: string | null
  commentCount: number
  lastCommentAt?: ISODateString | null
  author: CommunityAuthor
}

/**
 * 클럽 댓글은 커뮤니티 댓글과 같은 모양(1단 답글 + 삭제 플레이스홀더)을 쓴다.
 * 댓글 트리 빌더(buildCommunityCommentTree)도 그대로 재사용한다.
 */
export type ClubComment = CommunityComment

export interface ClubPostDetail extends ClubPost {
  comments: ClubComment[]
}
