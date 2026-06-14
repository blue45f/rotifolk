import EmptyState from '@components/feedback/EmptyState'
import Loading from '@components/feedback/Loading'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import {
  CLUB_CATEGORIES,
  CLUB_CATEGORY_LABEL,
  CLUB_VISIBILITY_LABEL,
  type ClubCategory,
} from '@rotifolk/shared'
import { useCurrentUser } from '@store/authStore'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import styles from './Clubs.module.css'

import { CATEGORY_META } from '@/domains/categories/meta'
import { useClubs } from '@/domains/clubs/queries'

const isClubCategory = (value: string | null): value is ClubCategory =>
  !!value && (CLUB_CATEGORIES as readonly string[]).includes(value)

function clubAccentStyle(category: ClubCategory): CSSProperties {
  return { '--club-accent': CATEGORY_META[category].accentHex } as CSSProperties
}

export default function ClubsPage() {
  const me = useCurrentUser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category')
  const category: 'all' | ClubCategory = isClubCategory(categoryParam) ? categoryParam : 'all'
  const [searchText, setSearchText] = useState(() => searchParams.get('q') ?? '')
  const [page, setPage] = useState(1)
  const query = {
    ...(category !== 'all' ? { category } : {}),
    ...(searchText.trim() ? { q: searchText.trim().slice(0, 40) } : {}),
    page,
    pageSize: 20,
  }
  const { data, isLoading, isError, refetch } = useClubs(query)

  const selectCategory = (next: 'all' | ClubCategory) => {
    setPage(1)
    setSearchParams(
      (params) => {
        if (next === 'all') params.delete('category')
        else params.set('category', next)
        return params
      },
      { replace: true }
    )
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <div>
            <h1>클럽</h1>
            <p>
              하룻밤 파티가 끝나도 잔은 다시 돕니다. 같은 취향이 정기적으로 모이는 자리, 마음 맞는
              클럽에 앉아보세요.
            </p>
          </div>
          <Button onClick={() => navigate('/clubs/new')}>클럽 만들기</Button>
        </header>

        <div className={styles.filters}>
          <div className={styles.chipRow} role="group" aria-label="카테고리 필터">
            <Chip selected={category === 'all'} onClick={() => selectCategory('all')}>
              전체
            </Chip>
            {CLUB_CATEGORIES.map((value) => (
              <Chip
                key={value}
                selected={category === value}
                leadingEmoji={CATEGORY_META[value].emoji}
                onClick={() => selectCategory(value)}
              >
                {CLUB_CATEGORY_LABEL[value]}
              </Chip>
            ))}
          </div>
          <div className={styles.searchRow}>
            <Input
              type="search"
              label="클럽 검색"
              placeholder="이름이나 소개로 검색"
              value={searchText}
              onChange={(event) => {
                setPage(1)
                setSearchText(event.target.value)
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={styles.stateBlock}>
            <Loading />
          </div>
        ) : isError ? (
          <div className={styles.stateBlock}>
            <EmptyState
              title="클럽 목록을 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <Button variant="soft" onClick={() => refetch()}>
                  다시 시도
                </Button>
              }
            />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className={styles.stateBlock}>
            <EmptyState
              title="아직 조건에 맞는 클럽이 없어요"
              description="첫 클럽을 직접 열어보세요. 운영자는 자동으로 첫 멤버가 됩니다."
              action={<Button onClick={() => navigate('/clubs/new')}>클럽 만들기</Button>}
            />
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {data.items.map((club) => (
                <li key={club.id} className={styles.row}>
                  <Link
                    to={`/clubs/${club.id}`}
                    className={styles.rowLink}
                    style={clubAccentStyle(club.category)}
                  >
                    <span className={styles.mark} aria-hidden="true">
                      {CATEGORY_META[club.category].emoji}
                    </span>
                    <span className={styles.rowBody}>
                      <span className={styles.rowTitleLine}>
                        <strong>{club.name}</strong>
                        {club.myRole && (
                          <span className={styles.joined}>
                            {club.myRole === 'owner' ? '내가 운영' : '가입함'}
                          </span>
                        )}
                      </span>
                      <span className={styles.rowDesc}>{club.description}</span>
                      <span className={styles.rowMeta}>
                        <span>{CLUB_CATEGORY_LABEL[club.category]}</span>
                        <span>{CLUB_VISIBILITY_LABEL[club.visibility]}</span>
                        <span>운영 {club.owner.nickname}</span>
                      </span>
                    </span>
                    <span className={styles.rowAside}>
                      멤버 {club.memberCount} · 글 {club.postCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {(data.hasNext || page > 1) && (
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
                  disabled={!data.hasNext}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}

        {!me && (
          <p className={styles.fieldHint}>
            클럽 가입과 게시판 참여에는 <Link to="/login?from=%2Fclubs">로그인</Link>이 필요해요.
          </p>
        )}
      </div>
    </main>
  )
}
