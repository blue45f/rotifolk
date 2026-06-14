import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PartyCardSkeletonGrid from './PartyCardSkeleton'

describe('PartyCardSkeletonGrid', () => {
  it('announces loading politely and hides the placeholder cards from assistive tech', () => {
    const { container } = render(<PartyCardSkeletonGrid />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('로딩 중')).toBeInTheDocument()
    // 카드 루트마다 aria-hidden — 기본 6장 그리드
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6)
  })

  it('renders the requested number of placeholder cards with a custom label', () => {
    const { container } = render(<PartyCardSkeletonGrid count={3} label="모임을 불러오는 중" />)

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
    expect(screen.getByText('모임을 불러오는 중')).toBeInTheDocument()
  })
})
