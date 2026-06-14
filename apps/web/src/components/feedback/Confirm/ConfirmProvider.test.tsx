import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmProvider } from './ConfirmProvider'
import { useConfirm } from './useConfirm'

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm()
  return (
    <button
      onClick={async () => {
        onResult(await confirm({ title: '삭제할까요?', confirmLabel: '삭제', danger: true }))
      }}
    >
      trigger
    </button>
  )
}

describe('ConfirmProvider', () => {
  it('확인을 누르면 true로 resolve된다', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(
      <ConfirmProvider>
        <Harness onResult={onResult} />
      </ConfirmProvider>
    )

    await user.click(screen.getByText('trigger'))
    expect(await screen.findByText('삭제할까요?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true))
  })

  it('취소를 누르면 false로 resolve된다', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(
      <ConfirmProvider>
        <Harness onResult={onResult} />
      </ConfirmProvider>
    )

    await user.click(screen.getByText('trigger'))
    await screen.findByText('삭제할까요?')

    await user.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false))
  })

  it('Provider 밖에서 useConfirm 호출 시 throw한다', () => {
    const Bad = () => {
      useConfirm()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Bad />)).toThrow(/ConfirmProvider/)
    spy.mockRestore()
  })
})
