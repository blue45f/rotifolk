/** Minimal RFC 5545 VEVENT generator for "Add to Calendar" downloads. */

const CRLF = '\r\n'

interface IcsEvent {
  uid: string
  title: string
  description?: string
  location?: string
  startAt: string | Date
  endAt: string | Date
  url?: string
}

function toUtc(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date passed to buildIcs: ${String(d)}`)
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Fold long lines to ≤ 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(line)
  if (bytes.length <= 75) return line

  const decoder = new TextDecoder()
  const chunks: string[] = []
  let start = 0
  while (start < bytes.length) {
    const limit = start === 0 ? 75 : 74
    let end = Math.min(start + limit, bytes.length)
    while (end > start && end < bytes.length && (bytes[end] & 0b1100_0000) === 0b1000_0000) {
      end -= 1
    }
    chunks.push(decoder.decode(bytes.subarray(start, end)))
    start = end
  }
  return chunks.join(`${CRLF} `)
}

export function buildIcs(ev: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rotifolk//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    fold(`UID:${ev.uid}`),
    `DTSTAMP:${toUtc(new Date())}`,
    `DTSTART:${toUtc(ev.startAt)}`,
    `DTEND:${toUtc(ev.endAt)}`,
    fold(`SUMMARY:${escapeText(ev.title)}`),
  ]
  if (ev.description) lines.push(fold(`DESCRIPTION:${escapeText(ev.description)}`))
  if (ev.location) lines.push(fold(`LOCATION:${escapeText(ev.location)}`))
  if (ev.url) lines.push(fold(`URL:${ev.url}`))
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join(CRLF) + CRLF
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
