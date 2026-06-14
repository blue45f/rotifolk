import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CLUB_CATEGORIES,
  CLUB_CATEGORY_LABEL,
  type ClubCategory,
  type ClubVisibility,
} from '@rotifolk/shared'
import { CATEGORY_META } from '@features/categories/meta'
import { useCreateClub } from '@features/clubs/queries'
import { Button } from '@components/ui/Button/Button'
import { Chip } from '@components/ui/Chip/Chip'
import { Input } from '@components/ui/Input/Input'
import { Icon } from '@components/ui/Icon/Icon'
import { useToast } from '@components/feedback/Toast/useToast'
import styles from './Clubs.module.css'

const NAME_MIN = 2
const NAME_MAX = 40
const DESC_MIN = 10
const DESC_MAX = 500

export default function ClubCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const createClub = useCreateClub()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClubCategory>('wine')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ClubVisibility>('public')
  const [showErrors, setShowErrors] = useState(false)

  const nameError =
    name.trim().length < NAME_MIN || name.trim().length > NAME_MAX
      ? `이름은 ${NAME_MIN}자 이상 ${NAME_MAX}자 이하로 지어주세요.`
      : null
  const descError =
    description.trim().length < DESC_MIN || description.trim().length > DESC_MAX
      ? `소개는 ${DESC_MIN}자 이상 ${DESC_MAX}자 이하로 적어주세요.`
      : null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (nameError || descError) {
      setShowErrors(true)
      return
    }
    try {
      const club = await createClub.mutateAsync({
        name: name.trim(),
        category,
        description: description.trim(),
        visibility,
      })
      toast.show('클럽이 만들어졌어요. 첫 글로 모임 리듬을 알려보세요.', 'success')
      navigate(`/clubs/${club.id}`, { replace: true })
    } catch (error) {
      toast.show((error as Error).message || '클럽을 만들지 못했어요.', 'error')
    }
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.kicker}>
              <Icon name="plus" aria-hidden="true" /> 새 클럽
            </span>
            <h1>클럽 만들기</h1>
            <p>
              정기적으로 같은 취향이 모이는 자리를 엽니다. 운영자는 자동으로 첫 멤버가 되고,
              클럽에서 바로 파티를 열 수 있어요.
            </p>
          </div>
        </header>

        <form className={styles.formNarrow} onSubmit={submit} noValidate>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              기본 정보
              <span className={styles.legendHint}>클럽의 이름과 분위기를 알려주세요.</span>
            </legend>
            <Input
              label="클럽 이름"
              placeholder="예: 한남 내추럴 와인회"
              value={name}
              maxLength={NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              error={showErrors && nameError ? nameError : undefined}
              hint={`${NAME_MIN}자 이상 ${NAME_MAX}자 이하`}
              required
            />

            <div>
              <span className={styles.fieldLabel} id="club-category-label">
                카테고리
              </span>
              <div className={styles.chipRow} role="group" aria-labelledby="club-category-label">
                {CLUB_CATEGORIES.map((value) => (
                  <Chip
                    key={value}
                    selected={category === value}
                    leadingEmoji={CATEGORY_META[value].emoji}
                    onClick={() => setCategory(value)}
                  >
                    {CLUB_CATEGORY_LABEL[value]}
                  </Chip>
                ))}
              </div>
              <p className={styles.fieldHint}>
                파티 분류와 같은 기준이라 클럽에서 파티로 바로 이어져요.
              </p>
            </div>

            <div>
              <label className={styles.fieldLabel} htmlFor="club-description">
                소개
              </label>
              <textarea
                id="club-description"
                className={styles.textarea}
                placeholder="어떤 사람들이, 얼마나 자주, 어떤 분위기로 모이는지 적어주세요."
                value={description}
                maxLength={DESC_MAX}
                onChange={(event) => setDescription(event.target.value)}
                aria-invalid={showErrors && !!descError}
                required
              />
              <div className={styles.counter}>
                {description.length}/{DESC_MAX}
              </div>
              {showErrors && descError && <p className={styles.fieldError}>{descError}</p>}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>
              공개 설정
              <span className={styles.legendHint}>게시판과 멤버 명단을 누구에게 열지 정해요.</span>
            </legend>
            <div className={styles.visibilityGroup}>
              <label className={styles.visibilityOption}>
                <input
                  type="radio"
                  name="club-visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                />
                <span>
                  <strong>공개 클럽</strong>
                  <span>누구나 게시판을 읽고, 가입하면 글을 쓸 수 있어요.</span>
                </span>
              </label>
              <label className={styles.visibilityOption}>
                <input
                  type="radio"
                  name="club-visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                />
                <span>
                  <strong>비공개 클럽</strong>
                  <span>목록에는 보이지만 게시판과 멤버 명단은 멤버만 볼 수 있어요.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className={styles.submitRow}>
            <Button
              type="submit"
              size="lg"
              leftIcon={<Icon name="check" aria-hidden="true" />}
              isLoading={createClub.isPending}
              disabled={createClub.isPending}
            >
              클럽 만들기
            </Button>
            <Link to="/clubs">목록으로 돌아가기</Link>
          </div>
        </form>
      </div>
    </main>
  )
}
