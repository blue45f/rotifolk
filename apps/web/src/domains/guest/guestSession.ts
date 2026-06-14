/**
 * 게스트(비로그인) 세션 — 기기 localStorage 토큰으로 재방문을 식별한다.
 * 같은 토큰을 여러 파티에서 재사용하고, 가입 시 이 토큰으로 참여 이력을 클레임한다.
 */
const STORAGE_KEY = 'rotifolk-guest-token'

export function getGuestToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setGuestToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // 프라이빗 모드 등 저장 불가 — 재방문 식별만 포기하고 참여는 계속된다.
  }
}

export function clearGuestToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
