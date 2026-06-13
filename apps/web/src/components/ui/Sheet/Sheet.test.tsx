import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from './Sheet'

function Harness({ onClose }: { onClose?: () => void } = {}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        시트 열기
      </button>
      <button type="button">바깥 버튼</button>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false)
          onClose?.()
        }}
        title="테스트 시트"
        description="시트 설명"
      >
        <button type="button">첫 번째</button>
        <button type="button">두 번째</button>
      </Sheet>
    </div>
  )
}

describe('Sheet (Radix Dialog 기반)', () => {
  it('열리면 dialog로 노출되고 제목/설명이 접근성 이름과 묶인다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    const dialog = screen.getByRole('dialog', { name: '테스트 시트' })
    expect(dialog).toBeInTheDocument()
    // 제목은 heading, 설명은 aria-describedby로 연결된다.
    expect(screen.getByRole('heading', { name: '테스트 시트' })).toBeInTheDocument()
    expect(dialog).toHaveAccessibleDescription('시트 설명')
  })

  it('열리면 시트 안 포커서블로 포커스가 들어간다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('Tab을 끝까지 돌려도 포커스가 시트 밖으로 새지 않는다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    // 열기 전에 바깥 버튼 참조를 잡아둔다 (모달이 열리면 a11y 트리에서 숨겨진다).
    const outside = screen.getByRole('button', { name: '바깥 버튼' })
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    const dialog = screen.getByRole('dialog')

    // 시트 안 포커서블 수보다 넉넉히 Tab을 눌러 순환을 강제한다.
    for (let i = 0; i < 6; i += 1) {
      await user.tab()
      expect(document.activeElement).not.toBe(outside)
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('Shift+Tab으로 역방향 순환해도 포커스가 시트 안에 머문다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 6; i += 1) {
      await user.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('Escape로 닫히면 onClose가 불리고 열기 전 트리거로 포커스가 돌아온다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: '시트 열기' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('닫기 버튼을 누르면 onClose가 불리고 시트가 사라진다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: '시트 열기' }))

    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
