import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import compression from 'compression'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  // Structured logging via nestjs-pino (JSON in prod, pino-pretty in dev) +
  // HTTP request autoLogging. Replaces the default unstructured console logger.
  app.useLogger(app.get(Logger))
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
  app.use(compression())
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
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
    }),
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
