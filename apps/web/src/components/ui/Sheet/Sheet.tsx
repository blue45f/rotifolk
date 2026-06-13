import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@components/ui/Icon/Icon'
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
 * Radix Dialog 기반 바텀 시트 / 모달. 포커스 트랩·Esc·스크롤 락·포커스 복원·
 * aria-modal 은 Radix 가 보장한다. 공개 API 는 기존과 동일하게 유지한다.
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
  // Controlled dialog (no Radix Trigger), so capture the opener ourselves and
  // restore focus to it on close — Radix only restores to its own Trigger.
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open) openerRef.current = document.activeElement as HTMLElement | null
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content
          className={`${styles.panel} ${styles[`v_${variant}`]} ${styles[`s_${size}`]}`}
          onCloseAutoFocus={(event) => {
            const opener = openerRef.current
            if (opener && opener.isConnected) {
              event.preventDefault()
              opener.focus()
            }
          }}
        >
          {title ? (
            <header className={styles.header}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              {description && (
                <Dialog.Description className={styles.desc}>{description}</Dialog.Description>
              )}
            </header>
          ) : (
            <VisuallyHidden>
              <Dialog.Title>대화 상자</Dialog.Title>
            </VisuallyHidden>
          )}
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
          <Dialog.Close className={styles.close} aria-label="닫기">
            <Icon name="close" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Sheet
