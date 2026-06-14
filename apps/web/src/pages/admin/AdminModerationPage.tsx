import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { useToast } from '@components/feedback/Toast/useToast'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import styles from './AdminModeration.module.css'

import type {
  ModeratePostDto,
  ModerationPostItem,
  ModerationPostStatus,
  ModerationScope,
  Paginated,
} from '@rotifolk/shared'

import { api } from '@/infrastructure/api'

/** AdminPage(통계·정산)와 분리된 콘텐츠 모더레이션 전용 라우트. */

interface ContentReport {
  id: string
  kind: string
  body: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  reporter: { id: string; nickname: string }
  communityPost: { id: string; title: string } | null
  communityComment: { id: string; postId: string; body: string } | null
  createdAt: string
}

const SCOPE_TABS: Array<{ value: ModerationScope; label: string }> = [
  { value: 'community', label: '커뮤니티' },
  { value: 'club', label: '클럽' },
]

const STATUS_FILTERS: Array<{ value: 'all' | ModerationPostStatus; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '공개' },
  { value: 'hidden', label: '숨김' },
  { value: 'removed', label: '삭제됨' },
]

const STATUS_LABEL: Record<ModerationPostStatus, string> = {
  open: '공개',
  hidden: '숨김',
  removed: '삭제됨',
}

const STATUS_CLASS: Record<ModerationPostStatus, string> = {
  open: styles.statusOpen,
  hidden: styles.statusHidden,
  removed: styles.statusRemoved,
}

const REPORT_KIND_LABEL: Record<string, string> = {
  harassment: '불쾌한 표현',
  spam: '홍보·스팸',
  inappropriate: '부적절한 내용',
  other: '기타',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const moderationKeys = {
  all: ['admin-moderation'] as const,
  posts: (scope: ModerationScope, status: string, q: string, page: number) =>
    [...moderationKeys.all, 'posts', scope, status, q, page] as const,
  reports: ['admin-moderation', 'reports'] as const,
}

export default function AdminModerationPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<ModerationScope>('community')
  const [status, setStatus] = useState<'all' | ModerationPostStatus>('all')
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)

  const q = searchText.trim().slice(0, 40)
  const postsQuery = useQuery({
    queryKey: moderationKeys.posts(scope, status, q, page),
    queryFn: () => {
      const params = new URLSearchParams({ scope, page: String(page), pageSize: '20' })
      if (status !== 'all') params.set('status', status)
      if (q) params.set('q', q)
      return api.get<Paginated<ModerationPostItem>>(`admin/moderation/posts?${params.toString()}`)
    },
  })

  const moderate = useMutation({
    mutationFn: (input: { postId: string; dto: ModeratePostDto }) =>
      api.patch<{ ok: true; status: string }>(`admin/moderation/posts/${input.postId}`, input.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.all })
    },
  })

  const runAction = async (post: ModerationPostItem, action: ModeratePostDto['action']) => {
    try {
      await moderate.mutateAsync({ postId: post.id, dto: { scope: post.scope, action } })
      const done =
        action === 'hide'
          ? '글을 숨겼어요.'
          : action === 'restore'
            ? '글을 복구했어요.'
            : action === 'remove'
              ? '글을 삭제 처리했어요.'
              : '첨부 이미지를 제거했어요.'
      toast.show(done, 'success')
    } catch (error) {
      toast.show((error as Error).message || '처리하지 못했어요.', 'error')
    }
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <div>
            <h1>콘텐츠 모더레이션</h1>
            <p>
              커뮤니티와 클럽 게시글의 숨김, 복구, 삭제, 첨부 제거를 처리합니다. 모든 조치는 감사
              로그에 남아요.
            </p>
          </div>
          <Link className={styles.backLink} to="/admin">
            관리자 홈으로
          </Link>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.chipRow} role="group" aria-label="대상 게시판">
            {SCOPE_TABS.map((item) => (
              <Chip
                key={item.value}
                selected={scope === item.value}
                onClick={() => {
                  setScope(item.value)
                  setPage(1)
                }}
              >
                {item.label}
              </Chip>
            ))}
          </div>
          <div className={styles.chipRow} role="group" aria-label="상태 필터">
            {STATUS_FILTERS.map((item) => (
              <Chip
                key={item.value}
                selected={status === item.value}
                onClick={() => {
                  setStatus(item.value)
                  setPage(1)
                }}
              >
                {item.label}
              </Chip>
            ))}
          </div>
          <div className={styles.searchBox}>
            <Input
              type="search"
              label="검색"
              placeholder="제목이나 본문으로 검색"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        {postsQuery.isLoading ? (
          <div className={styles.stateBlock}>
            <Loading />
          </div>
        ) : postsQuery.isError ? (
          <div className={styles.stateBlock}>
            <EmptyState
              emoji="🛠️"
              title="목록을 불러오지 못했어요"
              action={
                <Button variant="soft" onClick={() => postsQuery.refetch()}>
                  다시 시도
                </Button>
              }
            />
          </div>
        ) : !postsQuery.data || postsQuery.data.items.length === 0 ? (
          <div className={styles.stateBlock}>
            <EmptyState emoji="🍃" title="조건에 맞는 게시글이 없어요" />
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {postsQuery.data.items.map((post) => (
                <li key={`${post.scope}-${post.id}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <strong>{post.title}</strong>
                    <p className={styles.excerpt}>{post.excerpt}</p>
                    <div className={styles.metaLine}>
                      <span className={STATUS_CLASS[post.status]}>{STATUS_LABEL[post.status]}</span>
                      {post.clubName && <span>클럽 {post.clubName}</span>}
                      <span>{post.authorNickname}</span>
                      <span>{formatDate(post.createdAt)}</span>
                      <span>댓글 {post.commentCount}</span>
                      {post.hasImage && <span>첨부 있음</span>}
                      {post.reportCount > 0 && (
                        <span className={styles.reportFlag}>신고 {post.reportCount}건</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    {post.status === 'open' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={moderate.isPending}
                        onClick={() => runAction(post, 'hide')}
                      >
                        숨김
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={moderate.isPending}
                        onClick={() => runAction(post, 'restore')}
                      >
                        복구
                      </Button>
                    )}
                    {post.hasImage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={moderate.isPending}
                        onClick={() => runAction(post, 'clear-image')}
                      >
                        첨부 제거
                      </Button>
                    )}
                    {post.status !== 'removed' && (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={moderate.isPending}
                        onClick={() => runAction(post, 'remove')}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {(postsQuery.data.hasNext || page > 1) && (
              <div className={styles.pager}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  이전
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!postsQuery.data.hasNext}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}

        <ContentReportsSection />
      </div>
    </main>
  )
}

/** 커뮤니티 콘텐츠 신고 처리 — 기존 admin/reports API 재사용(콘텐츠 신고만 추림). */
function ContentReportsSection() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [hideContentById, setHideContentById] = useState<Record<string, boolean>>({})

  const reportsQuery = useQuery({
    queryKey: moderationKeys.reports,
    queryFn: () => api.get<ContentReport[]>('admin/reports?status=open'),
  })

  const resolveReport = useMutation({
    mutationFn: (input: { id: string; status: 'resolved' | 'dismissed'; hideContent: boolean }) =>
      api.patch(`admin/reports/${input.id}`, {
        status: input.status,
        hideContent: input.hideContent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: moderationKeys.all })
    },
  })

  const contentReports = (reportsQuery.data ?? []).filter(
    (report) => report.communityPost || report.communityComment
  )

  const handleResolve = async (report: ContentReport, status: 'resolved' | 'dismissed') => {
    try {
      await resolveReport.mutateAsync({
        id: report.id,
        status,
        hideContent: status === 'resolved' ? (hideContentById[report.id] ?? false) : false,
      })
      toast.show(status === 'resolved' ? '신고를 처리했어요.' : '신고를 기각했어요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '신고를 처리하지 못했어요.', 'error')
    }
  }

  return (
    <section aria-labelledby="content-reports-title">
      <h2 id="content-reports-title" className={styles.sectionTitle}>
        콘텐츠 신고 처리
      </h2>
      <p className={styles.sectionDesc}>
        커뮤니티 글과 댓글에 들어온 미처리 신고예요. 처리(인용) 시 "콘텐츠 숨김"을 켜면 대상 글이나
        댓글이 함께 숨겨져요.
      </p>

      {reportsQuery.isLoading ? (
        <div className={styles.stateBlock}>
          <Loading />
        </div>
      ) : contentReports.length === 0 ? (
        <div className={styles.stateBlock}>
          <EmptyState emoji="🕊️" title="대기 중인 콘텐츠 신고가 없어요" />
        </div>
      ) : (
        <ul className={styles.list}>
          {contentReports.map((report) => (
            <li key={report.id} className={styles.reportRow}>
              <div className={styles.reportHead}>
                <span className={styles.reportKind}>
                  {REPORT_KIND_LABEL[report.kind] ?? report.kind}
                </span>
                <span className={styles.reportTargetLine}>
                  {report.communityComment
                    ? `댓글: ${report.communityComment.body.slice(0, 60)}`
                    : `글: ${report.communityPost?.title ?? ''}`}
                </span>
                <span className={styles.reportTargetLine}>
                  신고자 {report.reporter.nickname} · {formatDate(report.createdAt)}
                </span>
              </div>
              <p className={styles.reportBody}>{report.body}</p>
              <div className={styles.reportActions}>
                <label className={styles.hideToggle}>
                  <input
                    type="checkbox"
                    checked={hideContentById[report.id] ?? false}
                    onChange={(event) =>
                      setHideContentById((prev) => ({
                        ...prev,
                        [report.id]: event.target.checked,
                      }))
                    }
                  />
                  처리 시 콘텐츠 숨김
                </label>
                <Button
                  size="sm"
                  variant="soft"
                  disabled={resolveReport.isPending}
                  onClick={() => handleResolve(report, 'resolved')}
                >
                  처리
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={resolveReport.isPending}
                  onClick={() => handleResolve(report, 'dismissed')}
                >
                  기각
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
