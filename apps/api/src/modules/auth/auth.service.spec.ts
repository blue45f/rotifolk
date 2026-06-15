import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { AuthService } from './auth.service'
import { Argon2Hasher } from './heejun/argon2-hasher'

/**
 * Critical-path security tests for the auth flow.
 *
 * These lock down the highest-risk invariants of signup/login:
 *  - passwords are hashed (never stored or returned in plaintext),
 *  - the issued user object never leaks `passwordHash`,
 *  - duplicate emails are rejected,
 *  - login does NOT reveal whether an email exists (same error + status for a
 *    missing account and a wrong password).
 *
 * Prisma is mocked (no DB needed); argon2 + the JWT/user mapper run for real so
 * the test exercises the actual hashing and sanitisation logic.
 */

type MockUserRow = {
  id: string
  email: string
  passwordHash: string
  nickname: string
  role: string
  accountStatus: string
  avatarId: string | null
  // toPublicUser reads many nullable columns + JSON strings + Dates.
  bio: string | null
  gender: string | null
  birthYear: number | null
  interestsJson: string
  mbti: string | null
  trustScore: number
  hostedCount: number
  joinedCount: number
  isVerified: boolean
  phone: string | null
  shareContact: boolean
  kakaoId: string | null
  shareKakao: boolean
  instagram: string | null
  shareInstagram: boolean
  avoidSameCompany: boolean
  showLikesReceived: boolean
  joinPopularityRanking: boolean
  profileJson: string
  occupation: string | null
  company: string | null
  incomeBand: string | null
  maritalStatus: string | null
  hasChildren: boolean | null
  education: string | null
  verifiedFieldsJson: string
  visibilityJson: string
  createdAt: Date
  updatedAt: Date
}

function makeUserRow(overrides: Partial<MockUserRow> = {}): MockUserRow {
  const now = new Date('2026-06-01T00:00:00.000Z')
  return {
    id: 'u_1',
    email: 'alice@example.com',
    passwordHash: 'PLACEHOLDER',
    nickname: 'alice',
    role: 'host',
    accountStatus: 'active',
    avatarId: 'av_1',
    bio: null,
    gender: null,
    birthYear: null,
    interestsJson: '[]',
    mbti: null,
    trustScore: 50,
    hostedCount: 0,
    joinedCount: 0,
    isVerified: false,
    phone: null,
    shareContact: false,
    kakaoId: null,
    shareKakao: false,
    instagram: null,
    shareInstagram: false,
    avoidSameCompany: false,
    showLikesReceived: true,
    joinPopularityRanking: true,
    profileJson: '{}',
    occupation: null,
    company: null,
    incomeBand: null,
    maritalStatus: null,
    hasChildren: null,
    education: null,
    verifiedFieldsJson: '[]',
    visibilityJson: '{}',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Minimal Prisma stub: findUnique + a $transaction that runs the callback. */
function makePrismaMock(opts: {
  existingByEmail?: MockUserRow | null
  existingById?: MockUserRow | null
}) {
  const created = makeUserRow({ id: 'u_new', avatarId: null })
  const tx = {
    user: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            passwordHash?: string
            email: string
            nickname: string
            provider?: string
            googleSub?: string
          }
        }) =>
          makeUserRow({
            id: 'u_new',
            email: data.email,
            nickname: data.nickname,
            passwordHash: data.passwordHash ?? 'PLACEHOLDER',
            avatarId: null,
          })
      ),
      update: vi.fn(async ({ data }: { data: { avatarId?: string } }) =>
        makeUserRow({
          id: 'u_new',
          avatarId: data.avatarId ?? 'av_new',
          passwordHash: created.passwordHash,
        })
      ),
    },
    avatar: { create: vi.fn(async () => ({ id: 'av_new' })) },
    referral: { create: vi.fn(async () => ({})) },
  }
  return {
    user: {
      findUnique: vi.fn(
        async ({ where }: { where: { email?: string; id?: string; referralCode?: string } }) => {
          if (where.email) return opts.existingByEmail ?? null
          if (where.id) return opts.existingById ?? null
          return null // referralCode lookups -> no referrer
        }
      ),
    },
    $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    __tx: tx,
  }
}

const tokensMock = { sign: vi.fn(() => 'signed.jwt.token') }
// AuthService now also takes ConfigService (for GOOGLE_CLIENT_ID); the
// password-path tests don't touch Google, so an empty config is sufficient.
const configMock = { get: vi.fn(() => undefined) }

describe('AuthService (critical auth path)', () => {
  beforeEach(() => {
    tokensMock.sign.mockClear()
  })

  describe('signUp', () => {
    it('hashes the password with argon2 and never returns it in the user object', async () => {
      const prisma = makePrismaMock({ existingByEmail: null })
      const service = new AuthService(
        prisma as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        null
      )

      const result = await service.signUp({
        email: 'new@example.com',
        password: 'Sup3rSecret!',
        nickname: 'newbie',
      } as never)

      // The hash written to the DB must be a real argon2 hash, not the plaintext.
      const createArgs = prisma.__tx.user.create.mock.calls[0][0]
      const storedHash = createArgs.data.passwordHash as string
      expect(storedHash).not.toBe('Sup3rSecret!')
      expect(storedHash.startsWith('$argon2')).toBe(true)
      expect(await argon2.verify(storedHash, 'Sup3rSecret!')).toBe(true)

      // The public response must never leak the password hash.
      expect(result.token).toBe('signed.jwt.token')
      expect(JSON.stringify(result.user)).not.toContain('passwordHash')
      expect(JSON.stringify(result)).not.toContain(storedHash)
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined()
    })

    it('rejects a duplicate email with the email_taken code', async () => {
      const prisma = makePrismaMock({ existingByEmail: makeUserRow() })
      const service = new AuthService(
        prisma as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        null
      )

      await expect(
        service.signUp({
          email: 'alice@example.com',
          password: 'whatever12',
          nickname: 'a',
        } as never)
      ).rejects.toBeInstanceOf(BadRequestException)

      // Must not attempt to create a user when the email is taken.
      expect(prisma.__tx.user.create).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('issues a session for valid credentials', async () => {
      const passwordHash = await argon2.hash('correct-horse')
      const prisma = makePrismaMock({ existingByEmail: makeUserRow({ passwordHash }) })
      const service = new AuthService(
        prisma as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        null
      )

      const result = await service.login({
        email: 'alice@example.com',
        password: 'correct-horse',
      } as never)

      expect(result.token).toBe('signed.jwt.token')
      expect(JSON.stringify(result.user)).not.toContain('passwordHash')
    })

    it('does not reveal whether the email exists: same error for unknown user and wrong password', async () => {
      // Unknown email.
      const noUser = new AuthService(
        makePrismaMock({ existingByEmail: null }) as never,
        jwtMock as never,
        configMock as never
      )
      const unknownErr = await noUser
        .login({ email: 'ghost@example.com', password: 'whatever' } as never)
        .catch((e) => e)

      // Known email, wrong password.
      const passwordHash = await argon2.hash('the-real-password')
      const wrongPw = new AuthService(
        makePrismaMock({ existingByEmail: makeUserRow({ passwordHash }) }) as never,
        jwtMock as never,
        configMock as never
      )
      const wrongErr = await wrongPw
        .login({ email: 'alice@example.com', password: 'not-it' } as never)
        .catch((e) => e)

      expect(unknownErr).toBeInstanceOf(UnauthorizedException)
      expect(wrongErr).toBeInstanceOf(UnauthorizedException)
      // Identical machine-readable code so the response can't be used to enumerate accounts.
      expect((unknownErr.getResponse() as { code: string }).code).toBe('invalid_credentials')
      expect((wrongErr.getResponse() as { code: string }).code).toBe('invalid_credentials')
    })

    it('rejects withdrawn accounts even when credentials are valid', async () => {
      const passwordHash = await argon2.hash('correct-horse')
      const prisma = makePrismaMock({
        existingByEmail: makeUserRow({ passwordHash, accountStatus: 'withdrawn' }),
      })
      const service = new AuthService(
        prisma as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        null
      )

      const err = await service
        .login({ email: 'alice@example.com', password: 'correct-horse' } as never)
        .catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect((err.getResponse() as { code: string }).code).toBe('account_inactive')
      expect(tokensMock.sign).not.toHaveBeenCalled()
    })
  })

  describe('googleAuth (via @heejun/auth OAuthVerifier port)', () => {
    it('rejects with google_not_configured when no verifier is provided', async () => {
      const service = new AuthService(
        makePrismaMock({ existingByEmail: null }) as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        null
      )
      const err = await service.googleAuth('cred').catch((e) => e)
      expect(err).toBeInstanceOf(UnauthorizedException)
      expect((err.getResponse() as { code: string }).code).toBe('google_not_configured')
    })

    it('creates a new user from the verified profile (name → nickname seed)', async () => {
      const oauth = {
        verify: vi.fn(async () => ({
          sub: 'g-sub',
          email: 'New@Gmail.com',
          emailVerified: true,
          name: 'Google Display',
        })),
      }
      const prisma = makePrismaMock({ existingByEmail: null })
      const service = new AuthService(
        prisma as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        oauth as never
      )
      const result = await service.googleAuth('cred')
      expect(result.token).toBe('signed.jwt.token')
      const createArgs = prisma.__tx.user.create.mock.calls[0][0]
      expect(createArgs.data.provider).toBe('google')
      expect(createArgs.data.googleSub).toBe('g-sub')
      expect(createArgs.data.email).toBe('new@gmail.com')
      expect(createArgs.data.nickname).toBe('Google Display')
    })

    it('rejects an unverified-email profile with google_invalid_token', async () => {
      const oauth = {
        verify: vi.fn(async () => ({ sub: 'g1', email: 'x@gmail.com', emailVerified: false })),
      }
      const service = new AuthService(
        makePrismaMock({ existingByEmail: null }) as never,
        tokensMock as never,
        new Argon2Hasher(),
        configMock as never,
        oauth as never
      )
      const err = await service.googleAuth('cred').catch((e) => e)
      expect(err).toBeInstanceOf(UnauthorizedException)
      expect((err.getResponse() as { code: string }).code).toBe('google_invalid_token')
    })
  })
})
