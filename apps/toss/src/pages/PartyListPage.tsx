import { Top } from '@toss/tds-mobile'
import { useCallback } from 'react'

import { PartyListCard } from '../features/party/components/PartyListCard'
import { usePartyBookmarks } from '../features/party/localBookmarks'
import { usePartyListPageState } from '../features/party/list/state'
import { theme, pageShell } from '../theme'
import { navigate } from '../router'
import { SearchBar, Chips } from '../ui'
import type { Party } from '../features/party/lib/partyApi'

export function PartyListPage() {
  const {
    loading,
    error,
    query,
    selectedCategory,
    categories,
    filteredItems,
    setQuery,
    setSelectedCategory,
    retry,
  } = usePartyListPageState()

  const { isBookmarked, toggle: toggleBookmark } = usePartyBookmarks()

  const open = (p: Party) => navigate(`/parties/${encodeURIComponent(p.id)}`)
  const onRetry = useCallback(() => {
    void retry()
  }, [retry])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: theme.bg }}>
        <Top
          title={<Top.TitleParagraph size={22}>🍷 로티포크</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15}>
              취향으로 만나는 라운드 로테이션 모임
            </Top.SubtitleParagraph>
          }
        />
        <div style={pageShell}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="pulse"
                style={{
                  height: 250,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius + 2,
                  background: theme.surface,
                  padding: 0,
                  overflow: 'hidden',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100dvh', background: theme.bg }}>
        <Top
          title={<Top.TitleParagraph size={22}>🍷 로티포크</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={15}>
              취향으로 만나는 라운드 로테이션 모임
            </Top.SubtitleParagraph>
          }
        />
        <div style={pageShell}>
          <div style={{ textAlign: 'center', color: theme.textMuted, padding: '80px 0' }}>
            <p style={{ fontSize: 16, marginBottom: 16 }}>모임 정보를 불러오는 데 실패했어요.</p>
            <button
              type="button"
              onClick={onRetry}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: theme.accent,
                color: theme.accentInk,
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: theme.bg }}>
      <Top
        title={<Top.TitleParagraph size={22}>🍷 로티포크</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            취향으로 만나는 라운드 로테이션 모임
          </Top.SubtitleParagraph>
        }
      />
      <div style={pageShell}>
        <div className="rise" style={{ marginBottom: 12 }}>
          <SearchBar value={query} onChange={setQuery} placeholder="모임·장소·취향 검색" />
        </div>
        <div className="rise" style={{ animationDelay: '60ms', marginBottom: 18 }}>
          <Chips items={categories} active={selectedCategory} onPick={setSelectedCategory} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredItems.map((p, i) => (
            <PartyListCard
              key={p.id}
              party={p}
              index={i}
              onOpen={() => open(p)}
              isBookmarked={isBookmarked(p.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))}
          {filteredItems.length === 0 && (
            <p style={{ textAlign: 'center', color: theme.textMuted, padding: '40px 0' }}>
              ‘{query || selectedCategory}’ 결과가 없어요.
            </p>
          )}
        </div>
        <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 14, paddingBottom: 12 }}>
          찜한 모임 {filteredItems.filter((p) => isBookmarked(p.id)).length}개
        </div>
      </div>
    </div>
  )
}
