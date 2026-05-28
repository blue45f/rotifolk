/** Minimal RFC 5545 VEVENT generator for "Add to Calendar" downloads. */

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

function escape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Fold long lines to ≤ 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let i = 0
  while (i < line.length) {
    chunks.push(line.slice(i, i + 75))
    i += 75
  }
  return chunks.join('\r\n ')
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
    fold(`SUMMARY:${escape(ev.title)}`),
  ]
  if (ev.description) lines.push(fold(`DESCRIPTION:${escape(ev.description)}`))
  if (ev.location) lines.push(fold(`LOCATION:${escape(ev.location)}`))
  if (ev.url) lines.push(fold(`URL:${ev.url}`))
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
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
