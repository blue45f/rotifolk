import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@components/feedback/Toast/ToastProvider'
import { HOST_DRAFT_KEY } from '@features/parties/hostDraft'
import { api } from '@services/api'
import HostCreatePage from './HostCreatePage'

vi.mock('@services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

function renderPage() {
  mockedApi.get.mockResolvedValue([])
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/host/parties/new']}>
          <HostCreatePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('HostCreatePage draft autosave', () => {
  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('저장된 드래프트를 폼에 복원하고 배지를 보여준다', () => {
    localStorage.setItem(HOST_DRAFT_KEY, JSON.stringify({ title: '복원된 와인 파티' }))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('임시저장')
    expect(screen.getByLabelText('파티 제목')).toHaveValue('복원된 와인 파티')
  })

  it('드래프트가 없으면 배지를 띄우지 않는다', () => {
    renderPage()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('파티 제목')).toHaveValue('')
  })

  it("'처음부터'는 2단 확인 뒤에만 드래프트를 지우고 폼을 비운다", async () => {
    localStorage.setItem(HOST_DRAFT_KEY, JSON.stringify({ title: '버릴 드래프트' }))
    const user = userEvent.setup()

    renderPage()

    await user.click(screen.getByRole('button', { name: '처음부터' }))
    // 1단계: 아직 지워지지 않고 확인 문구만 노출
    expect(localStorage.getItem(HOST_DRAFT_KEY)).not.toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('처음부터 시작할까요?')

    // '계속 작성'으로 물러설 수 있다
    await user.click(screen.getByRole('button', { name: '계속 작성' }))
    expect(screen.getByLabelText('파티 제목')).toHaveValue('버릴 드래프트')

    // 2단계 확정: 드래프트 제거 + 폼 초기화 + 배지 소멸
    await user.click(screen.getByRole('button', { name: '처음부터' }))
    await user.click(screen.getByRole('button', { name: '지우고 시작' }))
    expect(localStorage.getItem(HOST_DRAFT_KEY)).toBeNull()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByLabelText('파티 제목')).toHaveValue('')

    // reset이 깨운 watch 구독이 빈 드래프트를 도로 저장하지 않는다(디바운스 창 경과 후)
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(localStorage.getItem(HOST_DRAFT_KEY)).toBeNull()
  })

  it('입력이 멈추면 600ms 디바운스 후 드래프트를 저장한다', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('파티 제목'), '새 파티')
    // 타이핑 직후에는 아직 저장 전(디바운스 대기)
    expect(localStorage.getItem(HOST_DRAFT_KEY)).toBeNull()

    await waitFor(
      () => {
        const raw = localStorage.getItem(HOST_DRAFT_KEY)
        expect(raw).not.toBeNull()
        expect(JSON.parse(raw as string)).toMatchObject({ title: '새 파티' })
      },
      { timeout: 2000 },
    )
  })
})
