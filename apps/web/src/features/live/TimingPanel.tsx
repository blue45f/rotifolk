import { useId } from 'react'
import type { Participation, Party } from '@rotifolk/shared'
import { Avatar } from '@components/ui/Avatar/Avatar'
import { Badge } from '@components/ui/Badge/Badge'
import { Button } from '@components/ui/Button/Button'
import { useToast } from '@components/feedback/Toast/useToast'
import {
  buildTimeline,
  endTimeFromHHmm,
  formatClockKo,
  formatDurationKo,
  solveRoundDurationSec,
  timelineEndMs,
  type BreakRule,
} from './partyTiming'
import { ensureNotificationPermission, playRoundChime } from './roundAlarm'
import type { TimingSettings } from './useTimingSettings'
import styles from './TimingPanel.module.css'

interface TimingPanelProps {
  party: Party
  participants: Participation[]
  settings: TimingSettings
  onUpdate: (patch: Partial<TimingSettings>) => void
}

/**
 * 호스트 운영 패널 — 로스터(게스트 배지) + 시작 지연 + 종료 역산 +
 * 휴식 규칙 타임라인 + 라운드 알람 토글.
 */
export function TimingPanel({ party, participants, settings, onUpdate }: TimingPanelProps) {
  const toast = useToast()
  const endInputId = useId()
  const roundsInputId = useId()
  const breakNId = useId()
  const breakMId = useId()

  const startAtMs = new Date(party.startAt).getTime()
  const breakRule: BreakRule | null =
    settings.breakEveryN >= 1 && settings.breakMin >= 1
      ? { everyNRounds: settings.breakEveryN, breakMin: settings.breakMin }
      : null
  const totalRounds = settings.fixedEndEnabled
    ? (settings.fixedEndRounds ?? party.config.totalRounds)
    : party.config.totalRounds

  // 종료 역산 — 고정 종료 시각이 있으면 라운드당 시간을 휴식 차감 후 계산
  const fixedEndMs = settings.fixedEndEnabled
    ? endTimeFromHHmm(startAtMs, settings.fixedEndHHmm)
    : null
  const solvedRoundSec = fixedEndMs
    ? solveRoundDurationSec({
        startAtMs,
        endAtMs: fixedEndMs,
        totalRounds,
        breakBetweenRoundsSec: party.config.breakBetweenRoundsSec,
        delayMin: settings.delayMin,
        breakRule,
      })
    : null
  const effectiveRoundSec = solvedRoundSec ?? party.config.roundDurationSec

  const timelineInput = {
    startAtMs,
    totalRounds,
    roundDurationSec: effectiveRoundSec,
    breakBetweenRoundsSec: party.config.breakBetweenRoundsSec,
    delayMin: settings.delayMin,
    breakRule,
  }
  const blocks = buildTimeline(timelineInput)
  const endsAtMs = timelineEndMs(timelineInput)

  const handleAlarmToggle = async () => {
    if (settings.alarmOn) {
      onUpdate({ alarmOn: false })
      return
    }
    // 권한 요청은 토글을 켜는 이 순간 1회 — 거부돼도 차임(소리)은 동작한다.
    const granted = await ensureNotificationPermission()
    onUpdate({ alarmOn: true })
    playRoundChime()
    toast.show(
      granted ? '라운드 종료 알람을 켰어요 (차임+알림)' : '알람을 켰어요 — 차임만 울려요',
      'success',
    )
  }

  return (
    <div className={styles.panel}>
      {/* ── 로스터 — 게스트 표시 ───────────────────── */}
      <section aria-labelledby="ops-roster">
        <h3 className={styles.h3} id="ops-roster">
          로스터 ({participants.length}명)
        </h3>
        <ul className={styles.roster}>
          {participants.map((p) => (
            <li key={p.id} className={styles.rosterRow}>
              <Avatar
                size="sm"
                hue={p.guestAvatar?.hue ?? '#7A1F3D'}
                pattern="gradient"
                emoji={p.guestAvatar?.emoji ?? (p.user?.nickname ?? p.guestName ?? '익')[0]}
                imageSrc={p.guestAvatar?.imageData ?? p.user?.avatarImage ?? null}
              />
              <span className={styles.rosterName}>{p.user?.nickname ?? p.guestName ?? '익명'}</span>
              {p.isGuest && (
                <Badge tone="gold" size="sm">
                  🎟 게스트
                </Badge>
              )}
              {p.status === 'checked-in' && (
                <Badge tone="success" size="sm">
                  체크인
                </Badge>
              )}
            </li>
          ))}
          {participants.length === 0 && <li className={styles.muted}>아직 참가자가 없어요</li>}
        </ul>
      </section>

      {/* ── 시작 지연 ─────────────────────────────── */}
      <section aria-labelledby="ops-delay">
        <h3 className={styles.h3} id="ops-delay">
          시작 지연
        </h3>
        <p className={styles.statLine}>
          시작 {formatClockKo(startAtMs + settings.delayMin * 60_000)}
          {settings.delayMin > 0 && (
            <Badge tone="warning" size="sm">
              +{settings.delayMin}분 지연
            </Badge>
          )}
          <span className={styles.statSep} aria-hidden="true">
            ·
          </span>
          종료 예상 <strong>{formatClockKo(endsAtMs)}</strong>
        </p>
        <div className={styles.btnRow}>
          <Button
            variant="soft"
            size="sm"
            onClick={() => onUpdate({ delayMin: settings.delayMin + 5 })}
          >
            +5분
          </Button>
          <Button
            variant="soft"
            size="sm"
            onClick={() => onUpdate({ delayMin: settings.delayMin + 10 })}
          >
            +10분
          </Button>
          {settings.delayMin > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onUpdate({ delayMin: 0 })}>
              정시로 복원
            </Button>
          )}
        </div>
      </section>

      {/* ── 종료 역산 ─────────────────────────────── */}
      <section aria-labelledby="ops-end">
        <div className={styles.rowBetween}>
          <h3 className={styles.h3} id="ops-end">
            종료 시각 고정
          </h3>
          <button
            type="button"
            className={`${styles.switch} ${settings.fixedEndEnabled ? styles.switchOn : ''}`}
            role="switch"
            aria-checked={settings.fixedEndEnabled}
            aria-label="종료 시각 고정 모드"
            onClick={() => onUpdate({ fixedEndEnabled: !settings.fixedEndEnabled })}
          >
            <span className={styles.knob} aria-hidden="true" />
          </button>
        </div>
        {settings.fixedEndEnabled ? (
          <>
            <div className={styles.inlineFields}>
              <label className={styles.inlineField} htmlFor={endInputId}>
                <span>종료 시각</span>
                <input
                  id={endInputId}
                  type="time"
                  className={styles.timeInput}
                  value={settings.fixedEndHHmm}
                  onChange={(e) => onUpdate({ fixedEndHHmm: e.target.value })}
                />
              </label>
              <label className={styles.inlineField} htmlFor={roundsInputId}>
                <span>라운드 수</span>
                <input
                  id={roundsInputId}
                  type="number"
                  min={1}
                  max={20}
                  className={styles.numInput}
                  value={totalRounds}
                  onChange={(e) =>
                    onUpdate({
                      fixedEndRounds: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                    })
                  }
                />
              </label>
            </div>
            {fixedEndMs ? (
              solvedRoundSec ? (
                <p className={styles.solveResult}>
                  라운드당 <strong>{formatDurationKo(solvedRoundSec)}</strong>
                  <span className={styles.mutedInline}>(휴식 차감 후 자동 계산)</span>
                </p>
              ) : (
                <p className={styles.solveWarn} role="alert">
                  ⚠️ 그 시각까지 {totalRounds}라운드는 빠듯해요 — 라운드 수를 줄이거나 종료를
                  늦춰주세요.
                </p>
              )
            ) : (
              <p className={styles.muted}>종료 시각을 입력하면 라운드당 시간을 계산해요.</p>
            )}
          </>
        ) : (
          <p className={styles.muted}>
            끄면 파티 설정({formatDurationKo(party.config.roundDurationSec)}/라운드)을 그대로
            사용해요.
          </p>
        )}
      </section>

      {/* ── 휴식 규칙 ─────────────────────────────── */}
      <section aria-labelledby="ops-break">
        <h3 className={styles.h3} id="ops-break">
          쉬는 시간 규칙
        </h3>
        <div className={styles.inlineFields}>
          <label className={styles.inlineField} htmlFor={breakNId}>
            <span>몇 라운드마다</span>
            <input
              id={breakNId}
              type="number"
              min={0}
              max={10}
              className={styles.numInput}
              value={settings.breakEveryN}
              onChange={(e) =>
                onUpdate({ breakEveryN: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })
              }
            />
          </label>
          <label className={styles.inlineField} htmlFor={breakMId}>
            <span>휴식(분)</span>
            <input
              id={breakMId}
              type="number"
              min={1}
              max={60}
              className={styles.numInput}
              value={settings.breakMin}
              onChange={(e) =>
                onUpdate({ breakMin: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })
              }
            />
          </label>
        </div>
        <p className={styles.muted}>
          {breakRule
            ? `${breakRule.everyNRounds}라운드마다 ${breakRule.breakMin}분 휴식 — 타임라인에 반영됐어요.`
            : '0이면 규칙 없음 — 라운드 사이 기본 휴식만 적용돼요.'}
        </p>
      </section>

      {/* ── 타임라인 ─────────────────────────────── */}
      <section aria-labelledby="ops-timeline">
        <h3 className={styles.h3} id="ops-timeline">
          타임라인
        </h3>
        <ol className={styles.timeline}>
          {blocks.map((b) => (
            <li
              key={b.kind === 'round' ? `r${b.index}` : `b${b.afterRound}`}
              className={`${styles.block} ${
                b.kind === 'break' ? (b.long ? styles.blockLongBreak : styles.blockBreak) : ''
              }`}
            >
              <span className={styles.blockTime}>{formatClockKo(b.startAtMs)}</span>
              <span className={styles.blockLabel}>
                {b.kind === 'round'
                  ? `라운드 ${b.index}`
                  : b.long
                    ? `☕ 긴 휴식 ${formatDurationKo(b.durationSec)}`
                    : `쉼 ${formatDurationKo(b.durationSec)}`}
              </span>
              <span className={styles.blockDur}>{formatDurationKo(b.durationSec)}</span>
            </li>
          ))}
        </ol>
        <p className={styles.statLine}>
          전체 종료 <strong>{formatClockKo(endsAtMs)}</strong>
        </p>
      </section>

      {/* ── 라운드 알람 ───────────────────────────── */}
      <section aria-labelledby="ops-alarm">
        <div className={styles.rowBetween}>
          <h3 className={styles.h3} id="ops-alarm">
            라운드 종료 알람
          </h3>
          <button
            type="button"
            className={`${styles.switch} ${settings.alarmOn ? styles.switchOn : ''}`}
            role="switch"
            aria-checked={settings.alarmOn}
            aria-label="라운드 종료 알람"
            onClick={handleAlarmToggle}
          >
            <span className={styles.knob} aria-hidden="true" />
          </button>
        </div>
        <p className={styles.muted}>
          라운드가 끝나면 차임이 울리고 브라우저 알림이 떠요. 토글을 켤 때 알림 권한을 한 번
          물어봐요.
        </p>
      </section>
    </div>
  )
}

export default TimingPanel
