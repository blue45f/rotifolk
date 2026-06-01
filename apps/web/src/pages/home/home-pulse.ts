import type { PartyCategory, PartySummary } from '@rotifolk/shared'

const CATEGORY_LABELS: Record<PartyCategory, string> = {
  wine: '와인',
  'natural-wine': '내추럴 와인',
  coffee: '커피',
  tea: '차',
  whisky: '위스키',
  cocktail: '칵테일',
  beer: '맥주',
  sake: '사케',
  dessert: '디저트',
  custom: '커스텀',
}

export interface HomePulseCategory {
  category: PartyCategory
  label: string
  count: number
}

export interface HomePulse {
  liveCount: number
  openCount: number
  averageFillRate: number
  nextParty: PartySummary | null
  leadingCategory: HomePulseCategory | null
  hotAreas: Array<{ area: string; count: number }>
}

export function buildHomePulse(input: {
  openParties: PartySummary[]
  liveParties: PartySummary[]
}): HomePulse {
  const all = [...input.liveParties, ...input.openParties]
  const capacity = all.reduce((sum, party) => sum + Math.max(0, party.maxParticipants), 0)
  const participants = all.reduce((sum, party) => sum + Math.max(0, party.currentParticipants), 0)
  const averageFillRate = capacity > 0 ? Math.round((participants / capacity) * 100) : 0

  return {
    liveCount: input.liveParties.length,
    openCount: input.openParties.length,
    averageFillRate,
    nextParty:
      [...input.openParties].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      )[0] ?? null,
    leadingCategory: leadingCategory(all),
    hotAreas: topAreas(all),
  }
}

function leadingCategory(parties: PartySummary[]): HomePulseCategory | null {
  if (parties.length === 0) return null
  const counts = new Map<PartyCategory, number>()
  for (const party of parties) {
    counts.set(party.category, (counts.get(party.category) ?? 0) + 1)
  }
  const [category, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    category,
    label: CATEGORY_LABELS[category],
    count,
  }
}

function topAreas(parties: PartySummary[]) {
  const counts = new Map<string, number>()
  for (const party of parties) {
    counts.set(party.venueArea, (counts.get(party.venueArea) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([area, count]) => ({ area, count }))
}
