import { useState } from 'react'
import { NOTE_EMOJIS } from '@rotifolk/shared'
import { Sheet } from '@components/ui/Sheet/Sheet'
import { Button } from '@components/ui/Button/Button'
import { useToast } from '@components/feedback/Toast/useToast'
import { useSendNote } from './queries'
import styles from './SendNoteSheet.module.css'

interface SendNoteSheetProps {
  partyId: string
  toUserId: string
  toNickname: string
  open: boolean
  onClose: () => void
  roundIndex?: number | null
  /** 남은 쪽지 장수 (config.noteQuota - 이미 보낸 수). 미지정 시 제한 없음. */
  remainingQuota?: number | null
}

const MAX = 300

export function SendNoteSheet({
  partyId,
  toUserId,
  toNickname,
  open,
  onClose,
  roundIndex,
}: SendNoteSheetProps) {
  const { show } = useToast()
  const sendNote = useSendNote()
  const [body, setBody] = useState('')
  const [emoji, setEmoji] = useState<string | null>(null)
  const [shareContact, setShareContact] = useState(false)

  const trimmed = body.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MAX && !sendNote.isPending

  const reset = () => {
    setBody('')
    setEmoji(null)
    setShareContact(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleSend = () => {
    if (!canSend) return
    sendNote.mutate(
      {
        partyId,
        toUserId,
        body: trimmed,
        emoji,
        shareContact,
        roundIndex: roundIndex ?? null,
      },
      {
        onSuccess: () => {
          show(`${toNickname}님에게 쪽지를 보냈어요 💌`, 'success')
          close()
        },
        onError: () => show('쪽지를 보내지 못했어요. 다시 시도해 주세요', 'error'),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={`${toNickname}님에게 쪽지`}
      description="라운드에서의 한마디를 남겨보세요. 종료 후 또는 즉시 도착해요."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!canSend}
            isLoading={sendNote.isPending}
          >
            보내기
          </Button>
        </>
      }
    >
      <div className={styles.field}>
        <label htmlFor="note-body" className={styles.label}>
          쪽지 내용
        </label>
        <textarea
          id="note-body"
          className={styles.textarea}
          rows={5}
          maxLength={MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="예) 오늘 와인 취향 얘기 정말 즐거웠어요. 다음 잔도 같이 기울이고 싶네요 🍷"
          aria-describedby="note-counter"
        />
        <div className={styles.counterRow} id="note-counter">
          <span className={styles.counter}>
            {trimmed.length} / {MAX}
          </span>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>분위기 스티커</span>
        <div className={styles.emojiGrid} role="group" aria-label="분위기 스티커 선택">
          {NOTE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`${styles.emojiChip} ${emoji === e ? styles.emojiChipOn : ''}`}
              aria-pressed={emoji === e}
              onClick={() => setEmoji((prev) => (prev === e ? null : e))}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.contactToggle}>
        <input
          type="checkbox"
          checked={shareContact}
          onChange={(e) => setShareContact(e.target.checked)}
        />
        <span className={styles.contactText}>
          연락처 동봉
          <span className={styles.contactHint}>상대에게 내 연락처가 함께 전달돼요</span>
        </span>
      </label>
    </Sheet>
  )
}

export default SendNoteSheet
