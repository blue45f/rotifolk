import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PromptProvider } from './PromptProvider'
import { usePrompt } from './usePrompt'

function Harness({ onResult }: { onResult: (v: string | null) => void }) {
  const prompt = usePrompt()
  return (
    <button
      onClick={async () => {
        onResult(await prompt({ title: '닉네임 입력', label: '닉네임', confirmLabel: '입장' }))
      }}
    >
      trigger
    </button>
  )
}

describe('PromptProvider', () => {
  it('입력 후 확인을 누르면 입력값으로 resolve된다', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(
      <PromptProvider>
        <Harness onResult={onResult} />
      </PromptProvider>
    )

    await user.click(screen.getByText('trigger'))
    expect(await screen.findByText('닉네임 입력')).toBeInTheDocument()

    await user.type(screen.getByLabelText('닉네임'), '로티')
    await user.click(screen.getByRole('button', { name: '입장' }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('로티'))
  })

  it('취소를 누르면 null로 resolve된다', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(
      <PromptProvider>
        <Harness onResult={onResult} />
      </PromptProvider>
    )

    await user.click(screen.getByText('trigger'))
    await screen.findByText('닉네임 입력')

    await user.click(screen.getByRole('button', { name: '취소' }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null))
  })

  it('Escape로 닫으면 null로 resolve된다', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(
      <PromptProvider>
        <Harness onResult={onResult} />
      </PromptProvider>
    )

    await user.click(screen.getByText('trigger'))
    await screen.findByText('닉네임 입력')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null))
  })

  it('Provider 밖에서 usePrompt 호출 시 throw한다', () => {
    const Bad = () => {
      usePrompt()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Bad />)).toThrow(/PromptProvider/)
    spy.mockRestore()
  })
})
