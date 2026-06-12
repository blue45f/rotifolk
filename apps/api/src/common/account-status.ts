import { UnauthorizedException } from '@nestjs/common'

export const ACTIVE_ACCOUNT_STATUS = 'active'
export const SUSPENDED_ACCOUNT_STATUS = 'suspended'
export const WITHDRAWN_ACCOUNT_STATUS = 'withdrawn'

export type AccountStatus =
  | typeof ACTIVE_ACCOUNT_STATUS
  | typeof SUSPENDED_ACCOUNT_STATUS
  | typeof WITHDRAWN_ACCOUNT_STATUS

export function isAccountActive(status: string | null | undefined): boolean {
  return status === ACTIVE_ACCOUNT_STATUS
}

export function inactiveAccountException() {
  return new UnauthorizedException({
    code: 'account_inactive',
    message: '사용할 수 없는 계정이에요',
  })
}
