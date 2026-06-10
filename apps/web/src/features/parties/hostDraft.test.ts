import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HOST_DRAFT_KEY, clearHostDraft, loadHostDraft, saveHostDraft } from './hostDraft'

describe('hostDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when no draft is stored', () => {
    expect(loadHostDraft()).toBeNull()
  })

  it('round-trips a saved form snapshot', () => {
    saveHostDraft({ title: '한남 루프탑 와인 vol.13', minParticipants: 6 })
    expect(loadHostDraft()).toMatchObject({
      title: '한남 루프탑 와인 vol.13',
      minParticipants: 6,
    })
  })

  it('keeps mid-typing values that only break length rules', () => {
    // title 4자 미만·description 20자 미만은 제출 시 resolver가 다시 잡으므로 살린다
    saveHostDraft({ title: '한남', description: '아직 쓰는 중' })
    expect(loadHostDraft()).toMatchObject({ title: '한남', description: '아직 쓰는 중' })
  })

  it('drops only type-broken top-level keys and keeps the rest', () => {
    saveHostDraft({ title: '주말 내추럴 와인 모임', config: '깨진 값', maxParticipants: 12 })
    const draft = loadHostDraft()
    expect(draft).toMatchObject({ title: '주말 내추럴 와인 모임', maxParticipants: 12 })
    expect(draft).not.toHaveProperty('config')
  })

  it('returns null for corrupted or non-object payloads', () => {
    window.localStorage.setItem(HOST_DRAFT_KEY, '{not json')
    expect(loadHostDraft()).toBeNull()
    window.localStorage.setItem(HOST_DRAFT_KEY, JSON.stringify(['oops']))
    expect(loadHostDraft()).toBeNull()
  })

  it('clears the stored draft', () => {
    saveHostDraft({ title: '지울 드래프트' })
    clearHostDraft()
    expect(window.localStorage.getItem(HOST_DRAFT_KEY)).toBeNull()
    expect(loadHostDraft()).toBeNull()
  })

  it('silently ignores storage write failures (private mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveHostDraft({ title: '쿼터 초과' })).not.toThrow()
    spy.mockRestore()
  })
})
