import { describe, expect, it } from 'vitest'

import { buildIcs } from './buildIcs'

function physicalLines(value: string): string[] {
  return value.split('\r\n').filter(Boolean)
}

describe('ICS builder', () => {
  it('escapes text fields without leaking raw CR/LF characters inside a property', () => {
    const ics = buildIcs({
      uid: 'party-1',
      title: '와인, 티; 모임',
      description: '첫 줄\r\n둘째 줄, 세미콜론; 백슬래시 \\',
      startAt: '2026-06-01T10:00:00+09:00',
      endAt: '2026-06-01T12:00:00+09:00',
    })

    const description = physicalLines(ics).find((line) => line.startsWith('DESCRIPTION:'))

    expect(description).toBe('DESCRIPTION:첫 줄\\n둘째 줄\\, 세미콜론\\; 백슬래시 \\\\')
  })

  it('rejects invalid dates before emitting an unusable calendar file', () => {
    expect(() =>
      buildIcs({
        uid: 'party-1',
        title: '잘못된 일정',
        startAt: 'not-a-date',
        endAt: '2026-06-01T12:00:00+09:00',
      })
    ).toThrow(/Invalid date/)
  })

  it('folds long multibyte content lines to at most 75 UTF-8 octets', () => {
    const ics = buildIcs({
      uid: 'party-1',
      title: '한글'.repeat(40),
      description: '설명'.repeat(45),
      location: '성수동'.repeat(30),
      startAt: '2026-06-01T10:00:00+09:00',
      endAt: '2026-06-01T12:00:00+09:00',
    })

    const encoder = new TextEncoder()

    for (const line of physicalLines(ics)) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    }
  })
})
