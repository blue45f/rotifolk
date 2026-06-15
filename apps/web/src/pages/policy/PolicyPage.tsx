import EmptyState from '@components/feedback/EmptyState'
import { Button } from '@components/ui/Button/Button'
import { usePageMeta } from '@hooks/usePageMeta'
import { createElement } from 'react'
import { Link, useLocation } from 'react-router-dom'

import styles from './Policy.module.css'

import {
  parsePolicyBody,
  policyPublicUrl,
  usePolicy,
  type PolicyBlock,
  type PolicySlug,
} from '@/domains/policies'

/** 신뢰 표면에 노출하는 content hash 축약 길이(앞 12자). */
const SHORT_HASH_LENGTH = 12

interface PolicyRouteDoc {
  slug: PolicySlug
  /** 본문 로딩 전/실패 시 h1·탭 제목으로 쓰는 문서명(TermsDesk 게시명과 동일). */
  fallbackName: string
  metaDescription: string
}

/** 내부 라우트 → TermsDesk 문서 슬러그. /cancel-policy는 게시 슬러그가 refund-policy다. */
const ROUTE_DOCS: Record<string, PolicyRouteDoc> = {
  '/terms': {
    slug: 'terms-of-service',
    fallbackName: '이용약관',
    metaDescription: 'Rotifolk 서비스 이용약관 전문',
  },
  '/privacy': {
    slug: 'privacy-policy',
    fallbackName: '개인정보처리방침',
    metaDescription: 'Rotifolk 개인정보처리방침 전문',
  },
  '/cancel-policy': {
    slug: 'refund-policy',
    fallbackName: '이용·환불 정책',
    metaDescription: 'Rotifolk 모임 취소·환불 기준 전문',
  },
}

const SKELETON_LINE_WIDTHS = ['42%', '100%', '92%', '78%', '36%', '100%', '84%', '64%'] as const

function formatPolicyDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(date)
}

function PolicyBody({ blocks }: { blocks: PolicyBlock[] }) {
  return (
    <div className={styles.body}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return createElement(
            `h${block.level}`,
            { key: index, className: styles.bodyHeading },
            block.text
          )
        }
        if (block.kind === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          return (
            <ListTag key={index} className={styles.bodyList}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ListTag>
          )
        }
        if (block.kind === 'divider') {
          return <hr key={index} className={styles.divider} />
        }
        return (
          <p key={index} className={styles.bodyParagraph}>
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

export default function PolicyPage() {
  const { pathname } = useLocation()
  const doc = ROUTE_DOCS[pathname] ?? ROUTE_DOCS['/terms']
  const externalUrl = policyPublicUrl(doc.slug)

  const { data, isPending, isError, refetch } = usePolicy(doc.slug)

  usePageMeta({
    title: data?.name ?? doc.fallbackName,
    description: doc.metaDescription,
    path: pathname,
  })

  const otherDocs = Object.entries(ROUTE_DOCS).filter(([path]) => path !== pathname)

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <Link to="/policies" className={styles.back}>
          <Icon name="chevron-right" className={styles.backIcon} />
          <span>약관·정책</span>
        </Link>

        <p className={styles.kicker}>법적 고지</p>
        <h1 className={styles.title}>{data?.name ?? doc.fallbackName}</h1>

        {data?.effectiveAt && (
          <p className={styles.effective}>
            <Icon name="clock" className={styles.effectiveIcon} />
            <span>
              시행일 <time dateTime={data.effectiveAt}>{formatPolicyDate(data.effectiveAt)}</time>
            </span>
          </p>
        )}
      </header>

      {isPending && (
        <div className={styles.skeleton} role="status" aria-label="약관을 불러오는 중">
          {SKELETON_LINE_WIDTHS.map((width, index) => (
            <span
              key={index}
              className={styles.skeletonLine}
              style={{ width }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          emoji="📄"
          title="약관을 불러오지 못했어요"
          description="잠시 후 다시 시도하거나, 원문 페이지에서 바로 확인할 수 있어요."
          action={
            <div className={styles.errorActions}>
              <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
                다시 시도
              </Button>
              <a
                className={styles.externalLink}
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                원문 페이지에서 보기 ↗
              </a>
            </div>
          }
        />
      )}

      {data && (
        <>
          <PolicyBody blocks={parsePolicyBody(data.body)} />

          <footer className={styles.trust}>
            <dl className={styles.trustList}>
              <div className={styles.trustItem}>
                <dt>버전</dt>
                <dd>{data.versionLabel}</dd>
              </div>
              <div className={styles.trustItem}>
                <dt>해시</dt>
                <dd>
                  <code className={styles.hash} title={data.contentHash}>
                    {data.contentHash.slice(0, SHORT_HASH_LENGTH)}
                  </code>
                </dd>
              </div>
            </dl>
            <p className={styles.sourceNote}>
              <a
                className={styles.externalLink}
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                원문 보기 ↗
              </a>
            </p>
          </footer>
        </>
      )}

      <nav className={styles.docNav} aria-label="다른 약관 문서">
        <p className={styles.docNavLabel}>다른 문서 보기</p>
        <ul className={styles.docNavList}>
          {otherDocs.map(([path, other]) => (
            <li key={path}>
              <Link to={path} className={styles.docNavLink}>
                <span>{other.fallbackName}</span>
                <Icon name="chevron-right" className={styles.docNavIcon} />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/policies" className={styles.docNavLink}>
              <span>약관·정책 안내</span>
              <Icon name="chevron-right" className={styles.docNavIcon} />
            </Link>
          </li>
        </ul>
      </nav>
    </article>
  )
}
