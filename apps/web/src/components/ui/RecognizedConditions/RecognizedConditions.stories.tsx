import { RecognizedConditions } from './RecognizedConditions'

import type { SmartChip } from '@rotifolk/shared'
import type { Meta, StoryObj } from '@storybook/react-vite'

/**
 * Read-only "recognized search conditions" chip row used on the search page to
 * surface the structured filters the natural-language query was parsed into.
 * The chips are non-interactive info chips (no click/focus).
 */
const meta = {
  title: 'UI/RecognizedConditions',
  component: RecognizedConditions,
  parameters: {
    layout: 'padded',
  },
  args: {
    label: '인식한 조건',
    'aria-label': '인식된 검색 필터',
  },
} satisfies Meta<typeof RecognizedConditions>

export default meta
type Story = StoryObj<typeof meta>

const sampleChips: SmartChip[] = [
  { key: 'category', label: '와인', emoji: '🏷️' },
  { key: 'area', label: '한남', emoji: '📍' },
  { key: 'format', label: '믹서', emoji: '🎲' },
  { key: 'capacity', label: '8명', emoji: '👥' },
]

/** A typical recognized-conditions row mirroring the smart-search output. */
export const Default: Story = {
  args: {
    chips: sampleChips,
  },
}

/** A single recognized filter chip. */
export const SingleChip: Story = {
  args: {
    chips: [{ key: 'category', label: '와인', emoji: '🏷️' }],
  },
}

/** A chip without an emoji renders just the label (no mark). */
export const NoEmoji: Story = {
  args: {
    chips: [{ key: 'query', label: '내추럴 와인' }],
  },
}

/**
 * With no chips the component renders nothing (returns `null`), so this story
 * intentionally shows an empty canvas.
 */
export const Empty: Story = {
  args: {
    chips: [],
  },
}
