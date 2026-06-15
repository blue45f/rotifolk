import { useEffect, useRef } from 'react'

// Google Identity Services(GIS) ID 토큰 플로우. 버튼 콜백이 credential(ID 토큰)을
// 직접 받아 백엔드로 보낸다 — 리디렉션/redirect URI 없음.
interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (cfg: {
        client_id: string
        callback: (resp: { credential: string }) => void
      }) => void
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

function loadGis(): Promise<GoogleIdentityServices> {
  return new Promise((resolve, reject) => {
    if (globalThis.google?.accounts?.id) {
      resolve(globalThis.google)
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => globalThis.google && resolve(globalThis.google))
      existing.addEventListener('error', () => reject(new Error('GIS 로드 실패')))
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => globalThis.google && resolve(globalThis.google)
    script.onerror = () => reject(new Error('GIS 로드 실패'))
    document.head.appendChild(script)
  })
}

export function GoogleSignInButton({
  clientId,
  onCredential,
}: {
  clientId: string
  onCredential: (credential: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cbRef = useRef(onCredential)
  useEffect(() => {
    cbRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let cancelled = false
    loadGis()
      .then((gis) => {
        if (cancelled || !ref.current) return
        gis.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => cbRef.current(resp.credential),
        })
        gis.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: 280,
        })
      })
      .catch(() => {
        // 네트워크 차단/오프라인 시 버튼만 비노출 — 다른 로그인 수단은 그대로.
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  return <div ref={ref} />
}
