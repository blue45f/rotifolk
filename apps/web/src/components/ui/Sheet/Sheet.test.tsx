import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { Sheet } from './Sheet'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        시트 열기
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="테스트 시트">
        <button type="button">첫 번째</button>
        <button type="button">두 번째</button>
      </Sheet>
    </div>
  )
}

describe('Sheet focus trap', () => {
  it('열리면 시트 안 첫 포커서블로 포커스가 이동한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '첫 번째' }))
  })

  it('Tab이 시트 안에서 순환한다 (마지막 → 첫 요소)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    const closeButton = screen.getByRole('button', { name: '닫기' })
    closeButton.focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '첫 번째' }))
  })

  it('Shift+Tab은 첫 요소에서 마지막 요소로 순환한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }))
  })

  it('Escape로 닫히면 열기 전 트리거로 포커스를 되돌린다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: '시트 열기' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    // Radix unmounts the dialog and restores focus to the opener asynchronously.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
