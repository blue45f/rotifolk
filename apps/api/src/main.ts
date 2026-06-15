import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import compression from 'compression'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'
import { validateEnv } from './config/env'

import type { NestExpressApplication } from '@nestjs/platform-express'

import type { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  })
  // 기본 json 한도(100kb)는 data URL 업로드에 부족 — 아바타(캡 300K자)와
  // 게시글 첨부 이미지(캡 700K자)의 zod 캡이 실효성을 갖도록 1mb로 상향한다.
  app.useBodyParser('json', { limit: '1mb' })
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' })
  // Structured logging via nestjs-pino (JSON in prod, pino-pretty in dev) +
  // HTTP request autoLogging. Replaces the default unstructured console logger.
  const logger = app.get(Logger)
  app.useLogger(logger)
  // Non-fatal env validation: surfaces config mistakes + insecure prod defaults
  // as warnings. Intentionally never throws/exits so a bad env can't break boot.
  validateEnv(process.env, logger)
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.use(compression())
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  )
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173').split(','),
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  )

  // Let Nest run PrismaService.onModuleDestroy ($disconnect) on SIGTERM/SIGINT
  // so container shutdowns close the DB pool cleanly instead of leaking it.
  app.enableShutdownHooks()

  const port = Number(config.get('PORT') ?? 3000)
  await app.listen(port, '0.0.0.0')
  console.log(`🍷 Rotifolk API listening on http://localhost:${port}/api`)
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error', err)
  process.exit(1)
})
