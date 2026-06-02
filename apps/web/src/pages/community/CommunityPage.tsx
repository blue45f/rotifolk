import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  COMMUNITY_POST_CATEGORY_LABEL,
  type CommunityComment,
  type CommunityPostDetail,
  type CommunityPostCategory,
  type CreateReportDto,
} from '@rotifolk/shared'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import { useCurrentUser } from '@store/authStore'
import {
  useCommunityPost,
  useCommunityPosts,
  useCreateCommunityComment,
  useCreateCommunityPost,
  useReportCommunityContent,
} from '@features/community/queries'
import styles from './Community.module.css'

const CATEGORIES: Array<{ value: 'all' | CommunityPostCategory; label: string; hint: string }> = [
  { value: 'all', label: '전체', hint: '새 글과 활발한 답변' },
  { value: 'question', label: '질문', hint: '처음 참여 전 궁금한 점' },
  { value: 'after-party', label: '후기', hint: '모임 뒤 남기는 기록' },
  { value: 'venue-tip', label: '공간 팁', hint: '동네와 장소 추천' },
  { value: 'match-review', label: '매칭', hint: '연결 방식 경험담' },
]

const AREAS = ['한남동', '연남동', '북촌', '성수', '강남']

const REPORT_REASONS: Array<{ kind: CreateReportDto['kind']; label: string }> = [
  { kind: 'inappropriate', label: '부적절한 내용' },
  { kind: 'spam', label: '홍보·스팸' },
  { kind: 'harassment', label: '불쾌한 표현' },
  { kind: 'other', label: '기타' },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '방금 전'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function initials(name: string) {
  return name.slice(0, 2)
}

export default function CommunityPage() {
  const me = useCurrentUser()
  const [category, setCategory] = useState<'all' | CommunityPostCategory>('all')
  const [area, setArea] = useState<string>('')
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagText, setTagText] = useState('')
  const query = useMemo(
    () => ({
      category: category === 'all' ? undefined : category,
      area: area || undefined,
      pageSize: 16,
    }),
    [area, category],
  )
  const posts = useCommunityPosts(query)
  const detail = useCommunityPost(activePostId)
  const createPost = useCreateCommunityPost()

  useEffect(() => {
    if (!activePostId && posts.data?.items[0]) setActivePostId(posts.data.items[0].id)
  }, [activePostId, posts.data?.items])

  const submitPost = async (event: FormEvent) => {
    event.preventDefault()
    const tags = tagText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const created = await createPost.mutateAsync({
      title,
      body,
      category: category === 'all' ? 'question' : category,
      area: area || null,
      tags,
    })
    setTitle('')
    setBody('')
    setTagText('')
    setActivePostId(created.id)
  }

  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <Badge tone="info" size="md">
            로컬 커뮤니티
          </Badge>
          <h1>모임 전후의 궁금한 점을 바로 묻고 이어가세요</h1>
          <p>
            준비물, 분위기, 연락처 교환 방식까지. 처음 온 사람도 망설이지 않도록 질문과 답변을
            한곳에 모았습니다.
          </p>
        </div>
        <div className={styles.heroPanel} aria-label="커뮤니티 이용 흐름">
          <span>질문 작성</span>
          <strong>답변과 대댓글로 맥락 유지</strong>
          <small>무한 중첩 없이 한 단계 답장만 지원해 읽기 흐름을 지켜요.</small>
        </div>
      </section>

      <main className={`container ${styles.shell}`}>
        <section className={styles.mainColumn}>
          <form className={styles.composer} onSubmit={submitPost}>
            <div className={styles.composerHead}>
              <div>
                <h2>새 이야기 쓰기</h2>
                <p>
                  {me
                    ? `${me.nickname}님 이름으로 게시돼요.`
                    : '로그인하면 글과 답글을 남길 수 있어요.'}
                </p>
              </div>
              {!me && (
                <Link to="/login" className={styles.loginLink}>
                  로그인
                </Link>
              )}
            </div>
            <label className={styles.field}>
              <span>제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 첫 모임 전에 뭘 준비하면 좋을까요?"
                maxLength={80}
                disabled={!me || createPost.isPending}
                required
              />
            </label>
            <label className={styles.field}>
              <span>내용</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="상황을 짧게 적어주세요. 개인정보나 외부 연락처는 올리지 않는 것이 좋아요."
                maxLength={2000}
                disabled={!me || createPost.isPending}
                required
              />
            </label>
            <div className={styles.composerMeta}>
              <label className={styles.field}>
                <span>동네</span>
                <select
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  disabled={!me || createPost.isPending}
                >
                  <option value="">전체 동네</option>
                  {AREAS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>태그</span>
                <input
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  placeholder="와인초보, 첫참여"
                  disabled={!me || createPost.isPending}
                />
              </label>
            </div>
            {createPost.isError && (
              <p className={styles.error} role="alert">
                글을 저장하지 못했어요. 내용을 확인한 뒤 다시 시도해주세요.
              </p>
            )}
            <div className={styles.composerActions}>
              <span>{body.length}/2000</span>
              <Button type="submit" variant="gold" isLoading={createPost.isPending} disabled={!me}>
                글 올리기
              </Button>
            </div>
          </form>

          <div className={styles.filters} aria-label="커뮤니티 글 필터">
            {CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.filter} ${category === item.value ? styles.filterActive : ''}`}
                onClick={() => setCategory(item.value)}
                aria-pressed={category === item.value}
              >
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>

          <section className={styles.threadList} aria-label="커뮤니티 글 목록">
            {posts.isLoading ? (
              <Loading />
            ) : posts.isError ? (
              <div className={styles.stateBox} role="alert">
                <strong>커뮤니티 글을 불러오지 못했어요</strong>
                <Button variant="soft" onClick={() => posts.refetch()}>
                  다시 불러오기
                </Button>
              </div>
            ) : !posts.data || posts.data.items.length === 0 ? (
              <EmptyState
                emoji="💬"
                title="아직 올라온 이야기가 없어요"
                description="첫 질문을 남기면 같은 모임을 고민하는 사람들이 답을 이어갈 수 있어요."
              />
            ) : (
              posts.data.items.map((post) => (
                <article
                  key={post.id}
                  className={`${styles.postRow} ${activePostId === post.id ? styles.postRowActive : ''}`}
                >
                  <button type="button" onClick={() => setActivePostId(post.id)}>
                    <span className={styles.rowTop}>
                      <span>{COMMUNITY_POST_CATEGORY_LABEL[post.category]}</span>
                      <span>{formatDate(post.lastCommentAt ?? post.createdAt)}</span>
                    </span>
                    <strong>{post.title}</strong>
                    <p>{post.body}</p>
                    <span className={styles.rowMeta}>
                      <span>{post.area ?? '전체 동네'}</span>
                      <span>댓글 {post.commentCount}</span>
                      <span>{post.author.nickname}</span>
                    </span>
                  </button>
                </article>
              ))
            )}
          </section>
        </section>

        <aside className={styles.detailColumn} aria-label="선택한 커뮤니티 글">
          {!activePostId ? (
            <div className={styles.stateBox}>
              <strong>글을 선택하면 댓글이 보여요</strong>
              <p>대댓글은 한 단계만 열어 읽기 흐름을 유지합니다.</p>
            </div>
          ) : detail.isLoading ? (
            <Loading />
          ) : detail.isError || !detail.data ? (
            <div className={styles.stateBox} role="alert">
              <strong>스레드를 불러오지 못했어요</strong>
              <Button variant="soft" onClick={() => detail.refetch()}>
                다시 시도
              </Button>
            </div>
          ) : (
            <ThreadDetail post={detail.data} signedIn={!!me} currentUserId={me?.id} />
          )}
        </aside>
      </main>
    </div>
  )
}

function ThreadDetail({
  post,
  signedIn,
  currentUserId,
}: {
  post: CommunityPostDetail
  signedIn: boolean
  currentUserId?: string
}) {
  const [comment, setComment] = useState('')
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const createComment = useCreateCommunityComment(post.id)
  const report = useReportCommunityContent()
  const toast = useToast()

  const submitComment = async (event: FormEvent) => {
    event.preventDefault()
    await createComment.mutateAsync({ body: comment })
    setComment('')
  }

  const submitReply = async (event: FormEvent, parentId: string) => {
    event.preventDefault()
    await createComment.mutateAsync({ body: replyBody, parentId })
    setReplyTarget(null)
    setReplyBody('')
  }

  const reportContent = async (dto: CreateReportDto) => {
    try {
      await report.mutateAsync(dto)
      toast.show('신고가 접수됐어요. 운영팀이 확인할게요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '신고를 접수하지 못했어요.', 'error')
    }
  }

  return (
    <article className={styles.threadDetail}>
      <div className={styles.detailHead}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(post.author.nickname)}
        </span>
        <div>
          <span className={styles.authorLine}>
            {post.author.nickname}
            {post.author.isVerified && <em>인증</em>}
          </span>
          <span className={styles.detailTime}>
            {post.area ?? '전체 동네'} · {formatDate(post.createdAt)}
          </span>
        </div>
      </div>
      <h2>{post.title}</h2>
      <p className={styles.detailBody}>{post.body}</p>
      {post.tags.length > 0 && (
        <div className={styles.tags}>
          {post.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      {signedIn && currentUserId !== post.author.id && (
        <div className={styles.safetyRow}>
          <span>개인정보 유도, 홍보, 불쾌한 표현을 발견하면 알려주세요.</span>
          <ReportAction
            label="글 신고"
            disabled={report.isPending}
            onReport={(kind, label) =>
              reportContent({
                communityPostId: post.id,
                targetUserId: post.author.id,
                kind,
                body: `${label}: 커뮤니티 글 신고`,
              })
            }
          />
        </div>
      )}

      <form className={styles.commentForm} onSubmit={submitComment}>
        <label>
          <span>댓글 쓰기</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              signedIn ? '짧고 구체적인 답변을 남겨주세요.' : '로그인하면 댓글을 남길 수 있어요.'
            }
            maxLength={800}
            disabled={!signedIn || createComment.isPending}
            required
          />
        </label>
        <div className={styles.commentActions}>
          <span>{comment.length}/800</span>
          <Button size="sm" type="submit" isLoading={createComment.isPending} disabled={!signedIn}>
            댓글 등록
          </Button>
        </div>
      </form>

      <div className={styles.comments} aria-live="polite">
        {post.comments.length === 0 ? (
          <div className={styles.emptyComments}>아직 댓글이 없어요. 첫 답변을 남겨보세요.</div>
        ) : (
          post.comments.map((item) => (
            <CommentItem
              key={item.id}
              comment={item}
              signedIn={signedIn}
              replyTarget={replyTarget}
              replyBody={replyBody}
              isPending={createComment.isPending}
              reportPending={report.isPending}
              currentUserId={currentUserId}
              onReplyTarget={setReplyTarget}
              onReplyBody={setReplyBody}
              onSubmitReply={submitReply}
              onReportComment={(item, kind, label) =>
                reportContent({
                  communityPostId: post.id,
                  communityCommentId: item.id,
                  targetUserId: item.author.id,
                  kind,
                  body: `${label}: 커뮤니티 댓글 신고`,
                })
              }
            />
          ))
        )}
      </div>
    </article>
  )
}

function CommentItem({
  comment,
  signedIn,
  replyTarget,
  replyBody,
  isPending,
  reportPending,
  currentUserId,
  onReplyTarget,
  onReplyBody,
  onSubmitReply,
  onReportComment,
}: {
  comment: CommunityComment
  signedIn: boolean
  replyTarget: string | null
  replyBody: string
  isPending: boolean
  reportPending: boolean
  currentUserId?: string
  onReplyTarget: (id: string | null) => void
  onReplyBody: (value: string) => void
  onSubmitReply: (event: FormEvent, parentId: string) => void
  onReportComment: (comment: CommunityComment, kind: CreateReportDto['kind'], label: string) => void
}) {
  const isReplying = replyTarget === comment.id
  return (
    <div className={styles.comment}>
      <div className={styles.commentBody}>
        <span className={styles.avatarSmall} aria-hidden="true">
          {initials(comment.author.nickname)}
        </span>
        <div>
          <span className={styles.authorLine}>{comment.author.nickname}</span>
          <p>{comment.body}</p>
          <div className={styles.commentMeta}>
            <span>{formatDate(comment.createdAt)}</span>
            <button type="button" onClick={() => onReplyTarget(isReplying ? null : comment.id)}>
              답글
            </button>
            {signedIn && currentUserId !== comment.author.id && (
              <ReportAction
                label="댓글 신고"
                disabled={reportPending}
                onReport={(kind, label) => onReportComment(comment, kind, label)}
              />
            )}
          </div>
        </div>
      </div>
      {isReplying && (
        <form className={styles.replyForm} onSubmit={(event) => onSubmitReply(event, comment.id)}>
          <textarea
            value={replyBody}
            onChange={(event) => onReplyBody(event.target.value)}
            placeholder={signedIn ? '답글을 입력하세요.' : '로그인 후 답글을 남길 수 있어요.'}
            maxLength={800}
            disabled={!signedIn || isPending}
            required
          />
          <div className={styles.commentActions}>
            <button type="button" onClick={() => onReplyTarget(null)}>
              취소
            </button>
            <Button size="sm" type="submit" isLoading={isPending} disabled={!signedIn}>
              답글 등록
            </Button>
          </div>
        </form>
      )}
      {(comment.replies ?? []).length > 0 && (
        <div className={styles.replies}>
          {comment.replies?.map((reply) => (
            <div key={reply.id} className={styles.reply}>
              <span className={styles.avatarSmall} aria-hidden="true">
                {initials(reply.author.nickname)}
              </span>
              <div>
                <span className={styles.authorLine}>{reply.author.nickname}</span>
                <p>{reply.body}</p>
                <div className={styles.replyMeta}>
                  <span className={styles.detailTime}>{formatDate(reply.createdAt)}</span>
                  {signedIn && currentUserId !== reply.author.id && (
                    <ReportAction
                      label="답글 신고"
                      disabled={reportPending}
                      onReport={(kind, label) => onReportComment(reply, kind, label)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReportAction({
  label,
  disabled,
  onReport,
}: {
  label: string
  disabled: boolean
  onReport: (kind: CreateReportDto['kind'], label: string) => void
}) {
  return (
    <details className={styles.reportMenu}>
      <summary>{label}</summary>
      <div className={styles.reportOptions}>
        {REPORT_REASONS.map((reason) => (
          <button
            key={reason.kind}
            type="button"
            disabled={disabled}
            onClick={() => onReport(reason.kind, reason.label)}
          >
            {reason.label}
          </button>
        ))}
      </div>
    </details>
  )
}
