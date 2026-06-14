import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import styles from './Support.module.css'

import {
  createInquiry,
  INQUIRY_BODY_MAX,
  INQUIRY_BODY_MIN,
  INQUIRY_CATEGORIES,
  INQUIRY_CATEGORY_COPY,
  INQUIRY_FALLBACK_URL,
  INQUIRY_TITLE_MAX,
  isInquiryCategory,
  validateInquiryInput,
  type InquiryCategory,
  type InquiryReceipt,
} from '@/domains/inquiry/inquiries'

function formatReceiptDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const RECEIPT_STATUS_LABEL: Record<InquiryReceipt['status'], string> = {
  new: '접수됨',
  in_progress: '처리 중',
  closed: '완료',
}

export default function SupportPage() {
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category')
  const [category, setCategory] = useState<InquiryCategory>(
    isInquiryCategory(categoryParam) ? categoryParam : 'contact'
  )
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<InquiryReceipt | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const input = { category, title, body, contactEmail, website }
    const validationError = validateInquiryInput(input)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const created = await createInquiry(input, window.location.href)
      setReceipt(created)
    } catch (error) {
      setErrorMessage((error as Error).message || '문의 접수에 실패했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setReceipt(null)
    setTitle('')
    setBody('')
    setContactEmail('')
    setErrorMessage(null)
  }

  if (receipt) {
    return (
      <main className={styles.page}>
        <div className="container">
          <header className={styles.head}>
            <h1>문의가 접수됐어요</h1>
            <p>
              남겨주신 내용은 운영팀만 볼 수 있어요. 회신 이메일을 적었다면 그쪽으로 답을 드려요.
            </p>
          </header>
          <section className={styles.receipt} aria-label="접수 영수증">
            <span className={styles.receiptSeal} aria-hidden="true">
              ✓
            </span>
            <h2>접수 영수증</h2>
            <dl>
              <dt>접수 번호</dt>
              <dd>{receipt.id}</dd>
              <dt>분류</dt>
              <dd>{INQUIRY_CATEGORY_COPY[receipt.category]?.label ?? receipt.category}</dd>
              <dt>상태</dt>
              <dd>{RECEIPT_STATUS_LABEL[receipt.status] ?? receipt.status}</dd>
              <dt>접수 시각</dt>
              <dd>{formatReceiptDate(receipt.createdAt)}</dd>
            </dl>
            <div className={styles.actions}>
              <Button variant="soft" onClick={resetForm}>
                다른 문의 보내기
              </Button>
              <Link to="/">홈으로</Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <h1>문의하기</h1>
          <p>
            이용 문의, 제휴 제안, 버그 제보까지 이 폼 하나로 보내면 운영팀에 바로 닿아요. 본문과
            연락처는 외부에 공개되지 않아요.
          </p>
        </header>

        <form className={styles.form} onSubmit={submit} noValidate>
          <fieldset className={styles.categoryGroup}>
            <legend className={styles.fieldLabel}>문의 유형</legend>
            {INQUIRY_CATEGORIES.map((value) => (
              <label key={value} className={styles.categoryOption}>
                <input
                  type="radio"
                  name="inquiry-category"
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                />
                <span>
                  <strong>{INQUIRY_CATEGORY_COPY[value].label}</strong>
                  <span>{INQUIRY_CATEGORY_COPY[value].helper}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <Input
            label="제목"
            placeholder="한 줄로 요약해 주세요"
            value={title}
            maxLength={INQUIRY_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <div>
            <label className={styles.fieldLabel} htmlFor="inquiry-body">
              내용
            </label>
            <textarea
              id="inquiry-body"
              className={styles.textarea}
              placeholder={`어떤 상황이었는지 구체적으로 적어주세요. (${INQUIRY_BODY_MIN}자 이상)`}
              value={body}
              maxLength={INQUIRY_BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
              required
            />
            <div className={styles.counter}>
              {body.length}/{INQUIRY_BODY_MAX}
            </div>
          </div>

          <Input
            label="회신 이메일 (선택)"
            type="email"
            placeholder="답변 받을 주소가 있다면 적어주세요"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            hint="비워두면 회신 없이 접수만 됩니다."
          />

          {/* 허니팟 — 사람 눈에 보이지 않는 필드. 채워지면 서버가 조용히 폐기한다. */}
          <div className={styles.honeypot} aria-hidden="true">
            <label>
              웹사이트 (비워두세요)
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          {errorMessage && (
            <p className={styles.errorNote} role="alert">
              {errorMessage} 계속 실패하면{' '}
              <a href={INQUIRY_FALLBACK_URL} target="_blank" rel="noopener noreferrer">
                외부 지원 보드
              </a>
              로 보내주세요.
            </p>
          )}

          <div className={styles.actions}>
            <Button type="submit" isLoading={submitting} disabled={submitting}>
              문의 보내기
            </Button>
          </div>
        </form>

        <p className={styles.fallbackNote}>
          폼이 동작하지 않는 환경이라면 기존{' '}
          <a href={INQUIRY_FALLBACK_URL} target="_blank" rel="noopener noreferrer">
            TermsDesk 지원 보드
          </a>
          에서도 같은 문의를 남길 수 있어요.
        </p>
      </div>
    </main>
  )
}
