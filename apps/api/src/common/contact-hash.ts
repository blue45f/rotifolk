import { createHash } from 'node:crypto'
import { normalizePhoneKR } from '@rotifolk/shared'

const CONTACT_PEPPER = process.env.CONTACT_PEPPER ?? 'rotifolk-pepper'

export function hashPhone(phone: string): string {
  return createHash('sha256')
    .update(CONTACT_PEPPER + normalizePhoneKR(phone))
    .digest('hex')
}

export function normalizeContactPhone(phone: string): string {
  return normalizePhoneKR(phone)
}
