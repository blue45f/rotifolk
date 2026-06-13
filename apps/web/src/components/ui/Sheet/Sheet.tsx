import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useRef, type ReactNode } from 'react'

import styles from './Sheet.module.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'sheet' | 'modal'
}

/**
 * 브랜드 모달/바텀시트. Radix Dialog 헤드리스 프리미티브에 포커스 트랩·Esc·
 * 포커스 복원·스크롤 락·바깥 클릭 닫기를 위임하고, 표면은 기존 CSS 모듈
 * 클래스(+토큰/애니메이션)로 그대로 스타일링한다.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'sheet',
}: SheetProps) {
  // 열기 직전 포커스를 기억했다가 닫힐 때 그 자리로 되돌린다. (포털 타이밍에
  // 무관하게 복원을 보장 — 기존 Sheet의 previousFocusRef 동작을 유지.)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        {/* 스크림: 바깥 클릭/스크롤 락은 Radix가 처리한다. */}
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content
          className={`${styles.panel} ${styles[`v_${variant}`]} ${styles[`s_${size}`]}`}
          onOpenAutoFocus={() => {
            const active = document.activeElement
            previousFocusRef.current = active instanceof HTMLElement ? active : null
          }}
          onCloseAutoFocus={(event) => {
            const restoreTarget = previousFocusRef.current
            if (restoreTarget?.isConnected) {
              event.preventDefault()
              restoreTarget.focus()
            }
          }}
        >
          {title || description ? (
            <header className={styles.header}>
              {title ? (
                <Dialog.Title asChild>
                  <h2 className={styles.title}>{title}</h2>
                </Dialog.Title>
              ) : (
                <VisuallyHidden asChild>
                  <Dialog.Title>대화 상자</Dialog.Title>
                </VisuallyHidden>
              )}
              {description && (
                <Dialog.Description asChild>
                  <p className={styles.desc}>{description}</p>
                </Dialog.Description>
              )}
            </header>
          ) : (
            <VisuallyHidden asChild>
              <Dialog.Title>대화 상자</Dialog.Title>
            </VisuallyHidden>
          )}
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
          <Dialog.Close asChild>
            <button type="button" aria-label="닫기" className={styles.close}>
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Sheet
