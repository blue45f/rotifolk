import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CLUB_CATEGORY_LABEL,
  CLUB_VISIBILITY_LABEL,
  type ClubComment,
  type ClubDetail,
  type ClubMemberEntry,
} from '@rotifolk/shared'
import { CATEGORY_META } from '@features/categories/meta'
import {
  useClub,
  useClubPost,
  useClubPosts,
  useCreateClubComment,
  useCreateClubPost,
  useDeleteClubComment,
  useDeleteClubPost,
  useJoinClub,
  useLeaveClub,
} from '@features/clubs/queries'
import { AvatarImageError, resizePostImage } from '@features/avatar/imageUpload'
import {
  hasRequiredTerms,
  readTermsConsentState,
  TERMS_CONSENT_CHANGED_EVENT,
  TERMS_CONSENT_STORAGE_KEY,
  toTermsConsentState,
  type TermsConsentState,
} from '@features/legal/termsConsent'
import { useCurrentUser } from '@store/authStore'
import { Button } from '@components/ui/Button/Button'
import { Tabs } from '@components/ui/Tabs/Tabs'
import { LinkifiedText } from '@components/ui/LinkifiedText/LinkifiedText'
import Loading from '@components/feedback/Loading'
import EmptyState from '@components/feedback/EmptyState'
import { useToast } from '@components/feedback/Toast/ToastProvider'
import styles from './Clubs.module.css'

const TABS = [
  { value: 'board', label: '게시판' },
  { value: 'members', label: '멤버' },
  { value: 'about', label: '소개' },
]

const RING_SEAT_LIMIT = 8

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

/** 원탁 모티프 — 멤버 이니셜이 원 둘레에 앉는다(정적, 모션 없음). */
function MemberRing({ club }: { club: ClubDetail }) {
  const seats = club.members.slice(0, RING_SEAT_LIMIT)
  const extra = club.memberCount - seats.length
  return (
    <div
      className={styles.memberRing}
      role="img"
      aria-label={`멤버 ${club.memberCount}명이 함께하는 ${CLUB_CATEGORY_LABEL[club.category]} 클럽`}
    >
      <span className={styles.ringCenter} aria-hidden="true">
        {CATEGORY_META[club.category].emoji}
      </span>
      {seats.map((member, index) => (
        <span
          key={member.userId}
          className={styles.ringSeat}
          style={
            {
              '--seat-angle': `${(360 / Math.max(seats.length + (extra > 0 ? 1 : 0), 3)) * index}deg`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          {initials(member.nickname)}
        </span>
      ))}
      {extra > 0 && (
        <span
          className={`${styles.ringSeat} ${styles.ringSeatMore}`}
          style={
            {
              '--seat-angle': `${(360 / Math.max(seats.length + 1, 3)) * seats.length}deg`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          +{extra}
        </span>
      )}
    </div>
  )
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const me = useCurrentUser()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = TABS.some((item) => item.value === tabParam) ? (tabParam as string) : 'board'
  const activePostId = searchParams.get('post')

  const { data: club, isLoading, isError, refetch } = useClub(clubId)
  const joinClub = useJoinClub(clubId)
  const leaveClub = useLeaveClub(clubId)

  const [termsConsentState, setTermsConsentState] = useState<TermsConsentState>(() =>
    readTermsConsentState(),
  )
  const isTermsReady = hasRequiredTerms(termsConsentState.agreedIds)

  useEffect(() => {
    const refreshTerms = (next?: TermsConsentState) => {
      setTermsConsentState(next ?? readTermsConsentState())
    }
    const onStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === TERMS_CONSENT_STORAGE_KEY) refreshTerms()
    }
    const onTermsConsentChange = (event: Event) => {
      const detailState = toTermsConsentState((event as CustomEvent<TermsConsentState>).detail)
      refreshTerms(detailState ?? undefined)
    }
    window.addEventListener('storage', onStorageChange)
    window.addEventListener(TERMS_CONSENT_CHANGED_EVENT, onTermsConsentChange)
    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(TERMS_CONSENT_CHANGED_EVENT, onTermsConsentChange)
    }
  }, [])

  const selectTab = (next: string) => {
    setSearchParams(
      (params) => {
        if (next === 'board') params.delete('tab')
        else params.set('tab', next)
        params.delete('post')
        return params
      },
      { replace: true },
    )
  }

  const selectPost = (postId: string | null) => {
    setSearchParams(
      (params) => {
        if (postId) params.set('post', postId)
        else params.delete('post')
        return params
      },
      { replace: true },
    )
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.stateBlock}>
            <Loading />
          </div>
        </div>
      </main>
    )
  }

  if (isError || !club || !clubId) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.stateBlock}>
            <EmptyState
              title="클럽을 찾을 수 없어요"
              description="삭제되었거나 잘못된 주소일 수 있어요."
              action={
                <Button variant="soft" onClick={() => (club ? refetch() : navigate('/clubs'))}>
                  클럽 목록으로
                </Button>
              }
            />
          </div>
        </div>
      </main>
    )
  }

  const accentStyle = { '--club-accent': CATEGORY_META[club.category].accentHex } as CSSProperties
  const isMember = club.myRole !== null
  const isOwner = club.myRole === 'owner'
  const loginHref = `/login?from=${encodeURIComponent(`/clubs/${club.id}`)}`
  const partyHref = `/quick?category=${club.category}&club=${encodeURIComponent(club.name)}`

  const handleJoin = async () => {
    if (!me) {
      navigate(loginHref)
      return
    }
    try {
      await joinClub.mutateAsync()
      toast.show(`${club.name}에 가입했어요. 게시판에서 인사를 남겨보세요.`, 'success')
    } catch (error) {
      toast.show((error as Error).message || '가입하지 못했어요.', 'error')
    }
  }

  const handleLeave = async () => {
    try {
      await leaveClub.mutateAsync()
      toast.show('클럽에서 나왔어요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '탈퇴하지 못했어요.', 'error')
    }
  }

  return (
    <main className={styles.page} style={accentStyle}>
      <div className="container">
        <nav
          aria-label="이동 경로"
          className={styles.detailMetaLine}
          style={{ paddingTop: 'var(--space-6)' }}
        >
          <Link to="/clubs">클럽</Link>
          <span aria-hidden="true">/</span>
          <span>{club.name}</span>
        </nav>

        <header className={styles.detailHead}>
          <MemberRing club={club} />
          <div>
            <div className={styles.detailTitleRow}>
              <h1>{club.name}</h1>
              {club.myRole && (
                <span className={styles.joined}>{isOwner ? '내가 운영' : '가입함'}</span>
              )}
            </div>
            <p className={styles.detailDesc}>{club.description}</p>
            <div className={styles.detailMetaLine}>
              <span>{CLUB_CATEGORY_LABEL[club.category]}</span>
              <span>{CLUB_VISIBILITY_LABEL[club.visibility]} 클럽</span>
              <span>멤버 {club.memberCount}명</span>
              <span>글 {club.postCount}개</span>
              <span>운영 {club.owner.nickname}</span>
            </div>
            <div className={styles.detailActions}>
              {!isMember ? (
                <Button onClick={handleJoin} isLoading={joinClub.isPending}>
                  클럽 가입하기
                </Button>
              ) : (
                <>
                  <Button variant="gold" onClick={() => navigate(partyHref)}>
                    이 클럽으로 파티 열기
                  </Button>
                  {!isOwner && (
                    <Button variant="ghost" onClick={handleLeave} isLoading={leaveClub.isPending}>
                      탈퇴
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        <Tabs tabs={TABS} value={tab} onChange={selectTab} variant="underline" />

        {tab === 'board' && (
          <ClubBoard
            club={club}
            clubId={clubId}
            activePostId={activePostId}
            onSelectPost={selectPost}
            isMember={isMember}
            isTermsReady={isTermsReady}
            signedIn={!!me}
            currentUserId={me?.id}
            loginHref={loginHref}
            onJoin={handleJoin}
          />
        )}
        {tab === 'members' && <ClubMembers club={club} />}
        {tab === 'about' && <ClubAbout club={club} />}
      </div>
    </main>
  )
}

function ClubBoard({
  club,
  clubId,
  activePostId,
  onSelectPost,
  isMember,
  isTermsReady,
  signedIn,
  currentUserId,
  loginHref,
  onJoin,
}: {
  club: ClubDetail
  clubId: string
  activePostId: string | null
  onSelectPost: (postId: string | null) => void
  isMember: boolean
  isTermsReady: boolean
  signedIn: boolean
  currentUserId?: string
  loginHref: string
  onJoin: () => void
}) {
  const toast = useToast()
  const navigate = useNavigate()
  const { data: posts, isLoading } = useClubPosts(clubId, club.canViewBoard)
  const createPost = useCreateClubPost(clubId)
  const deletePost = useDeleteClubPost(clubId)

  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!club.canViewBoard) {
    return (
      <div className={`${styles.sectionGap} ${styles.lockedNote}`}>
        <p>비공개 클럽 게시판은 멤버만 볼 수 있어요. 가입하면 글과 댓글이 바로 열립니다.</p>
        {signedIn ? (
          <Button onClick={onJoin}>가입하고 게시판 보기</Button>
        ) : (
          <Button onClick={() => navigate(loginHref)}>로그인하고 가입하기</Button>
        )}
      </div>
    )
  }

  const canWrite = signedIn && isMember && isTermsReady
  const writeBlockedReason = !signedIn
    ? '글을 쓰려면 로그인이 필요해요.'
    : !isMember
      ? '클럽에 가입하면 글을 쓸 수 있어요.'
      : !isTermsReady
        ? '필수 약관 동의 후 글을 쓸 수 있어요.'
        : null

  const attachImage = async (file: File | undefined) => {
    if (!file) return
    setImageBusy(true)
    try {
      setImageData(await resizePostImage(file))
    } catch (error) {
      toast.show(
        error instanceof AvatarImageError ? error.message : '사진을 처리하지 못했어요.',
        'error',
      )
    } finally {
      setImageBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const submitPost = async (event: FormEvent) => {
    event.preventDefault()
    if (!canWrite) {
      if (writeBlockedReason) toast.show(writeBlockedReason, 'warning')
      return
    }
    try {
      const created = await createPost.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        imageData,
      })
      setTitle('')
      setBody('')
      setImageData(null)
      setComposerOpen(false)
      toast.show('글을 올렸어요.', 'success')
      onSelectPost(created.id)
    } catch (error) {
      toast.show((error as Error).message || '글을 올리지 못했어요.', 'error')
    }
  }

  const removePost = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId)
      if (activePostId === postId) onSelectPost(null)
      toast.show('글을 삭제했어요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '글을 삭제하지 못했어요.', 'error')
    }
  }

  return (
    <div className={styles.sectionGap}>
      {composerOpen ? (
        <form className={styles.composer} onSubmit={submitPost}>
          <label>
            <span className={styles.fieldLabel}>제목</span>
            <input
              className={styles.composerInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={4}
              maxLength={80}
              placeholder="모임 공지, 후기, 제안 무엇이든 좋아요"
              required
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>내용</span>
            <textarea
              className={styles.replyArea}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              minLength={10}
              maxLength={2000}
              placeholder="클럽 멤버에게 전할 이야기를 적어주세요. (10자 이상)"
              required
            />
          </label>
          {imageData && (
            <div className={styles.attachPreview}>
              <img src={imageData} alt="첨부할 이미지 미리보기" />
            </div>
          )}
          <div className={styles.composerFootRow}>
            <div className={styles.formActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                style={{ display: 'none' }}
                onChange={(event) => attachImage(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isLoading={imageBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageData ? '사진 바꾸기' : '사진 첨부'}
              </Button>
              {imageData && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageData(null)}>
                  사진 제거
                </Button>
              )}
              <span className={styles.fieldHint}>2MB 이하, svg 제외</span>
            </div>
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setComposerOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" size="sm" isLoading={createPost.isPending} disabled={!canWrite}>
                올리기
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className={styles.composerFootRow}>
          <Button
            variant="soft"
            onClick={() => {
              if (!canWrite && writeBlockedReason) {
                toast.show(writeBlockedReason, 'warning')
                return
              }
              setComposerOpen(true)
            }}
          >
            새 글 쓰기
          </Button>
          {writeBlockedReason && <span className={styles.fieldHint}>{writeBlockedReason}</span>}
        </div>
      )}

      {isLoading ? (
        <div className={styles.stateBlock}>
          <Loading />
        </div>
      ) : !posts || posts.items.length === 0 ? (
        <div className={styles.stateBlock}>
          <EmptyState
            emoji="📝"
            title="아직 게시글이 없어요"
            description="첫 글로 다음 모임 이야기를 시작해 보세요."
          />
        </div>
      ) : (
        <ul className={`${styles.postList} ${styles.sectionGap}`}>
          {posts.items.map((post) => (
            <li key={post.id} className={styles.postRow}>
              <button
                type="button"
                className={styles.postRowBtn}
                aria-expanded={activePostId === post.id}
                onClick={() => onSelectPost(activePostId === post.id ? null : post.id)}
              >
                <span>
                  <strong>{post.title}</strong>
                  <span className={styles.postRowMeta}>
                    <span>{post.author.nickname}</span>
                    <span>{formatDate(post.createdAt)}</span>
                    {post.imageData && <span aria-label="사진 첨부됨">사진</span>}
                  </span>
                </span>
                <span className={styles.postRowCount}>댓글 {post.commentCount}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {activePostId && (
        <ClubPostDetailBlock
          clubId={clubId}
          postId={activePostId}
          signedIn={signedIn}
          isMember={isMember}
          isTermsReady={isTermsReady}
          currentUserId={currentUserId}
          onDeletePost={removePost}
          onClose={() => onSelectPost(null)}
        />
      )}
    </div>
  )
}

function ClubPostDetailBlock({
  clubId,
  postId,
  signedIn,
  isMember,
  isTermsReady,
  currentUserId,
  onDeletePost,
  onClose,
}: {
  clubId: string
  postId: string
  signedIn: boolean
  isMember: boolean
  isTermsReady: boolean
  currentUserId?: string
  onDeletePost: (postId: string) => void
  onClose: () => void
}) {
  const toast = useToast()
  const { data: post, isLoading } = useClubPost(clubId, postId)
  const createComment = useCreateClubComment(clubId, postId)
  const deleteComment = useDeleteClubComment(clubId, postId)
  const [comment, setComment] = useState('')
  const [replyTarget, setReplyTarget] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const canComment = signedIn && isMember && isTermsReady

  if (isLoading) {
    return (
      <div className={styles.postDetail}>
        <Loading />
      </div>
    )
  }
  if (!post) {
    return (
      <div className={styles.postDetail}>
        <EmptyState emoji="🫥" title="글을 찾을 수 없어요" description="삭제되었을 수 있어요." />
      </div>
    )
  }

  const isPostOwner = currentUserId === post.author.id

  const submitComment = async (event: FormEvent) => {
    event.preventDefault()
    if (!canComment) return
    try {
      await createComment.mutateAsync({ body: comment.trim() })
      setComment('')
      toast.show('댓글을 남겼어요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '댓글을 남기지 못했어요.', 'error')
    }
  }

  const submitReply = async (event: FormEvent, parentId: string) => {
    event.preventDefault()
    if (!canComment) return
    try {
      await createComment.mutateAsync({ body: replyBody.trim(), parentId })
      setReplyBody('')
      setReplyTarget(null)
      toast.show('답글을 남겼어요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '답글을 남기지 못했어요.', 'error')
    }
  }

  const removeComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId)
      toast.show('댓글을 삭제했어요.', 'success')
    } catch (error) {
      toast.show((error as Error).message || '댓글을 삭제하지 못했어요.', 'error')
    }
  }

  return (
    <article className={styles.postDetail} aria-label={`게시글 ${post.title}`}>
      <div className={styles.postDetailHead}>
        <div>
          <h3>{post.title}</h3>
          <div className={styles.postDetailMeta}>
            <span>{post.author.nickname}</span>
            <span>{formatDate(post.createdAt)}</span>
          </div>
        </div>
        <div className={styles.formActions}>
          {isPostOwner && (
            <Button variant="ghost" size="sm" onClick={() => onDeletePost(post.id)}>
              삭제
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>

      <p className={styles.postBody}>
        <LinkifiedText text={post.body} />
      </p>
      {post.imageData && (
        <img className={styles.postImage} src={post.imageData} alt={`${post.title} 첨부 이미지`} />
      )}

      <form className={styles.commentForm} onSubmit={submitComment}>
        <label>
          <span className={styles.fieldLabel}>댓글 쓰기</span>
          <textarea
            className={styles.replyArea}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={800}
            placeholder={
              canComment
                ? '클럽 멤버에게 답을 남겨주세요.'
                : '댓글은 로그인 + 클럽 가입 + 필수 약관 동의가 필요해요.'
            }
            disabled={!canComment || createComment.isPending}
            required
          />
        </label>
        <div className={styles.commentActions}>
          <span>{comment.length}/800</span>
          <Button
            size="sm"
            type="submit"
            isLoading={createComment.isPending}
            disabled={!canComment}
          >
            댓글 등록
          </Button>
        </div>
      </form>

      <div className={styles.commentList} aria-live="polite">
        {post.comments.length === 0 ? (
          <p className={styles.fieldHint}>아직 댓글이 없어요. 첫 답을 남겨보세요.</p>
        ) : (
          post.comments.map((item) => (
            <ClubCommentNode
              key={item.id}
              comment={item}
              currentUserId={currentUserId}
              canComment={canComment}
              isPending={createComment.isPending}
              replyTarget={replyTarget}
              replyBody={replyBody}
              onReplyTarget={setReplyTarget}
              onReplyBody={setReplyBody}
              onSubmitReply={submitReply}
              onRemove={removeComment}
            />
          ))
        )}
      </div>
    </article>
  )
}

function ClubCommentNode({
  comment,
  currentUserId,
  canComment,
  isPending,
  replyTarget,
  replyBody,
  onReplyTarget,
  onReplyBody,
  onSubmitReply,
  onRemove,
}: {
  comment: ClubComment
  currentUserId?: string
  canComment: boolean
  isPending: boolean
  replyTarget: string | null
  replyBody: string
  onReplyTarget: (id: string | null) => void
  onReplyBody: (value: string) => void
  onSubmitReply: (event: FormEvent, parentId: string) => void
  onRemove: (commentId: string) => void
}) {
  const isReplying = replyTarget === comment.id
  const isDeleted = comment.deleted === true

  return (
    <div className={styles.comment}>
      <div className={styles.commentAuthorLine}>
        <strong>{isDeleted ? '삭제된 댓글' : comment.author.nickname}</strong>
        {!isDeleted && <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>}
      </div>
      {isDeleted ? (
        <p className={styles.commentDeleted}>작성자가 삭제한 댓글이에요. 답글은 남아 있어요.</p>
      ) : (
        <p className={styles.commentBody}>
          <LinkifiedText text={comment.body} />
        </p>
      )}
      <div className={styles.commentMetaRow}>
        {!isDeleted && canComment && (
          <button type="button" onClick={() => onReplyTarget(isReplying ? null : comment.id)}>
            {isReplying ? '답글 취소' : '답글'}
          </button>
        )}
        {!isDeleted && currentUserId === comment.author.id && (
          <button type="button" onClick={() => onRemove(comment.id)}>
            삭제
          </button>
        )}
      </div>

      {isReplying && (
        <form className={styles.replyForm} onSubmit={(event) => onSubmitReply(event, comment.id)}>
          <textarea
            className={styles.replyArea}
            value={replyBody}
            onChange={(event) => onReplyBody(event.target.value)}
            maxLength={800}
            placeholder="답글을 입력하세요."
            disabled={isPending}
            required
          />
          <div className={styles.commentActions}>
            <Button type="button" variant="ghost" size="sm" onClick={() => onReplyTarget(null)}>
              취소
            </Button>
            <Button size="sm" type="submit" isLoading={isPending}>
              답글 등록
            </Button>
          </div>
        </form>
      )}

      {(comment.replies ?? []).length > 0 && (
        <div className={styles.replies}>
          {comment.replies?.map((reply) => (
            <div key={reply.id} className={styles.replyItem}>
              <div className={styles.commentAuthorLine}>
                <strong>{reply.author.nickname}</strong>
                <time dateTime={reply.createdAt}>{formatDate(reply.createdAt)}</time>
              </div>
              <p className={styles.commentBody}>
                <LinkifiedText text={reply.body} />
              </p>
              {currentUserId === reply.author.id && (
                <div className={styles.commentMetaRow}>
                  <button type="button" onClick={() => onRemove(reply.id)}>
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClubMembers({ club }: { club: ClubDetail }) {
  if (club.members.length === 0) {
    return (
      <div className={`${styles.sectionGap} ${styles.lockedNote}`}>
        <p>비공개 클럽의 멤버 명단은 가입한 멤버만 볼 수 있어요.</p>
      </div>
    )
  }
  return (
    <ul className={`${styles.memberList} ${styles.sectionGap}`}>
      {club.members.map((member: ClubMemberEntry) => (
        <li key={member.userId} className={styles.memberRow}>
          <span className={styles.memberAvatar} aria-hidden="true">
            {initials(member.nickname)}
          </span>
          <span className={styles.memberName}>
            {member.nickname}
            {member.role === 'owner' && <span className={styles.joined}> · 운영자</span>}
          </span>
          <span className={styles.memberSince}>{formatDate(member.joinedAt)} 합류</span>
        </li>
      ))}
    </ul>
  )
}

function ClubAbout({ club }: { club: ClubDetail }) {
  return (
    <div className={`${styles.aboutBlock} ${styles.sectionGap}`}>
      <p className={styles.detailDesc}>{club.description}</p>
      <dl>
        <dt>카테고리</dt>
        <dd>{CLUB_CATEGORY_LABEL[club.category]}</dd>
        <dt>공개 설정</dt>
        <dd>
          {CLUB_VISIBILITY_LABEL[club.visibility]} ·{' '}
          {club.visibility === 'public'
            ? '누구나 게시판을 읽을 수 있어요'
            : '게시판과 명단은 멤버 전용이에요'}
        </dd>
        <dt>만든 날</dt>
        <dd>{formatDate(club.createdAt)}</dd>
        <dt>운영자</dt>
        <dd>{club.owner.nickname}</dd>
      </dl>
    </div>
  )
}
