import { Button, type ButtonProps } from '@components/ui/Button/Button'
import { useState } from 'react'

import { ShareSheet } from './ShareSheet'

export interface ShareButtonProps {
  title: string
  category: string
  venueArea: string
  startAtISO: string
  currentParticipants: number
  maxParticipants: number
  /** 완성된 초대 절대 URL. (useShare.buildInviteUrl로 만든 값) */
  inviteUrl: string
  gradient?: string
  /** 버튼 라벨. 기본 "공유". */
  label?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  fullWidth?: boolean
  className?: string
}

/**
 * 모임 상세/카드 어디에나 끼워 넣는 공유 버튼.
 * 누르면 ShareSheet(프로모 카드 + SNS 원탭 공유)를 연다.
 */
export function ShareButton({
  title,
  category,
  venueArea,
  startAtISO,
  currentParticipants,
  maxParticipants,
  inviteUrl,
  gradient,
  label = '공유',
  variant = 'soft',
  size = 'md',
  fullWidth,
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        leftIcon={<span aria-hidden="true">↗</span>}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label}
      </Button>
      <ShareSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        category={category}
        venueArea={venueArea}
        startAtISO={startAtISO}
        currentParticipants={currentParticipants}
        maxParticipants={maxParticipants}
        inviteUrl={inviteUrl}
        gradient={gradient}
      />
    </>
  )
}

export default ShareButton
