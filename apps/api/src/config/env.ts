import { z } from 'zod'

/**
 * Non-fatal environment validation.
 *
 * This module DOES NOT replace the existing `process.env` reads scattered across
 * the app (auth secrets, payments policy, CORS, etc.) and intentionally never
 * throws or exits: a malformed env must not be able to break a live boot. It
 * runs a Zod `safeParse` at startup purely to surface configuration mistakes as
 * warnings, and to loudly flag known-unsafe development defaults when running in
 * production.
 */

const optionalString = z.string().trim().min(1).optional()

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  CORS_ORIGIN: optionalString,
  PUBLIC_BASE_URL: optionalString,
  DATABASE_URL: optionalString,
  JWT_SECRET: optionalString,
  JWT_EXPIRES_IN: optionalString,
  CONTACT_PEPPER: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  KAKAO_CLIENT_ID: optionalString,
  KAKAO_CLIENT_SECRET: optionalString,
  KAKAO_CALLBACK_URL: optionalString,
  PLATFORM_FEE_PERCENT: z.coerce.number().optional(),
  REFUND_RETENTION_PERCENT: z.coerce.number().optional(),
  MIN_HOST_PAYOUT_PERCENT: z.coerce.number().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Secrets that, if left at one of these well-known development defaults while
 * running in production, should trigger a loud warning. These match the literal
 * fallback values used throughout the codebase plus common placeholder strings.
 */
const UNSAFE_DEFAULTS: Record<string, readonly string[]> = {
  JWT_SECRET: [
    'dev-secret-change-me',
    'dev-only-change-me-please',
    'change-me-to-a-long-random-secret-please',
    'change-me-in-production',
    'change-me',
    'mypassword',
  ],
  CONTACT_PEPPER: ['rotifolk-pepper', 'change-me-contact-pepper', 'change-me'],
  DATABASE_URL: [
    'postgresql://localhost:5432/rotifolk',
    'postgresql://rotifolk:rotifolk@localhost:5432/rotifolk',
  ],
}

type Logger = { warn: (message: string) => void; error: (message: string) => void }

/**
 * Validate environment variables without ever throwing. Logs warnings for schema
 * issues and a prominent error-level warning for unsafe production defaults.
 *
 * @param env    the environment object to validate (defaults to `process.env`)
 * @param logger sink for messages (defaults to `console`)
 */
export function validateEnv(
  env: NodeJS.ProcessEnv = process.env,
  logger: Logger = console
): { success: boolean } {
  const result = envSchema.safeParse(env)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    logger.warn(`[env] environment validation warnings (non-fatal): ${issues}`)
  }

  if (env.NODE_ENV === 'production') {
    const flagged: string[] = []
    for (const [key, unsafe] of Object.entries(UNSAFE_DEFAULTS)) {
      const value = env[key]
      if (value !== undefined && unsafe.includes(value)) {
        flagged.push(key)
      }
    }
    if (flagged.length > 0) {
      logger.error(
        `[env] ⚠️  INSECURE PRODUCTION CONFIG: ${flagged.join(', ')} ${
          flagged.length === 1 ? 'is' : 'are'
        } still set to a known development default. Set a strong, unique value before serving real traffic.`
      )
    }
  }

  return { success: result.success }
}
