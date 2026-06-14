import { ToastProvider } from '@components/feedback/Toast/ToastProvider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ShareSheet } from './ShareSheet'

function renderSheet(onClose = vi.fn()) {
  render(
    <ToastProvider>
      <ShareSheet
        open
        onClose={onClose}
        title="한남 와인 로테이션"
        category="wine"
        venueArea="한남동"
        startAtISO="2026-06-01T10:00:00.000Z"
        currentParticipants={6}
        maxParticipants={8}
        inviteUrl="http://localhost:5173/parties/p_wine"
      />
    </ToastProvider>
  )
  return { onClose }
}

describe('ShareSheet', () => {
  it('uses distinct accessible names for the backdrop and explicit close button', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSheet()

    expect(screen.getByRole('dialog', { name: '모임 공유하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '배경 닫기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '닫기' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
