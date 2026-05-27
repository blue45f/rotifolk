/**
 * RFC 5545 호환 ICS(iCalendar) 빌더.
 *
 * 캘린더 앱(Apple Calendar, Google Calendar, Outlook 등)이 파티 일정을
 * 가져갈 수 있도록 VCALENDAR + VEVENT 텍스트를 생성한다.
 */

export interface IcsParty {
  id: string
  title: string
  description?: string
  startAt: string | Date
  endAt: string | Date
  venueName?: string
  venueArea?: string
}

const PRODID = '-//Rotifolk//Calendar Export//KO'
const CRLF = '\r\n'

/**
 * Date 또는 ISO string을 RFC 5545의 `YYYYMMDDTHHMMSSZ` (UTC) 포맷으로 변환.
 */
function toUtcStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date passed to buildIcs: ${String(value)}`)
  }
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  const hh = date.getUTCHours().toString().padStart(2, '0')
  const mm = date.getUTCMinutes().toString().padStart(2, '0')
  const ss = date.getUTCSeconds().toString().padStart(2, '0')
  return `${y}${m}${d}T${hh}${mm}${ss}Z`
}

/**
 * RFC 5545 §3.3.11 TEXT escape:
 *   백슬래시, 세미콜론, 콤마, 개행 문자를 이스케이프한다.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

/**
 * RFC 5545 §3.1 Content Line folding — 75 octets 초과 시 CRLF + 공백으로 접는다.
 * 한글 같은 멀티바이트 문자를 안전하게 처리하기 위해 UTF-8 바이트 길이 기준으로 분할.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(line)
  if (bytes.length <= 75) return line

  const decoder = new TextDecoder()
  const chunks: string[] = []
  let start = 0
  while (start < bytes.length) {
    const limit = start === 0 ? 75 : 74 // 후속 라인은 선행 공백 1바이트
    let end = Math.min(start + limit, bytes.length)
    // UTF-8 멀티바이트 시퀀스 한가운데서 자르지 않도록 보정
    while (end > start && end < bytes.length && (bytes[end] & 0b1100_0000) === 0b1000_0000) {
      end -= 1
    }
    chunks.push(decoder.decode(bytes.subarray(start, end)))
    start = end
  }
  return chunks.join(`${CRLF} `)
}

/**
 * 파티 데이터를 RFC 5545 호환 ICS 텍스트로 변환한다.
 *
 * - VCALENDAR + VEVENT 구조
 * - UID는 `<id>@rotifolk.app`
 * - DTSTART/DTEND는 UTC `YYYYMMDDTHHMMSSZ`
 * - SUMMARY, DESCRIPTION, LOCATION 포함
 * - CRLF 줄 끝
 */
export function buildIcs(party: IcsParty): string {
  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push(`PRODID:${PRODID}`)
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${party.id}@rotifolk.app`)
  lines.push(`DTSTAMP:${toUtcStamp(new Date())}`)
  lines.push(`DTSTART:${toUtcStamp(party.startAt)}`)
  lines.push(`DTEND:${toUtcStamp(party.endAt)}`)
  lines.push(`SUMMARY:${escapeText(party.title)}`)
  if (party.description) {
    lines.push(`DESCRIPTION:${escapeText(party.description)}`)
  }
  const locationParts = [party.venueName, party.venueArea].filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  )
  if (locationParts.length > 0) {
    lines.push(`LOCATION:${escapeText(locationParts.join(', '))}`)
  }
  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join(CRLF) + CRLF
}

/**
 * party 정보로 ICS 텍스트를 만들어 브라우저 다운로드를 트리거한다.
 * (a.download + Blob URL 트릭)
 */
export function downloadIcs(party: IcsParty): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const ics = buildIcs(party)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const slug = party.title
    .replace(/[\\/:*?"<>|]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'party'
  const filename = `rotifolk-${slug}-${party.id}.ics`

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  // 브라우저가 다운로드를 시작할 시간을 준 뒤 URL을 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
