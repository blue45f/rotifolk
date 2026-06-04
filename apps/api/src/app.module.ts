import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { PartiesModule } from './modules/parties/parties.module'
import { VenuesModule } from './modules/venues/venues.module'
import { VenueBookingsModule } from './modules/venue-bookings/venue-bookings.module'
import { MatchingModule } from './modules/matching/matching.module'
import { QuizModule } from './modules/quiz/quiz.module'
import { QuestionCardsModule } from './modules/question-cards/question-cards.module'
import { OrdersModule } from './modules/orders/orders.module'
import { LiveModule } from './modules/live/live.module'
import { HealthModule } from './modules/health/health.module'
import { AvatarsModule } from './modules/avatars/avatars.module'
import { ChatModule } from './modules/chat/chat.module'
import { SafetyModule } from './modules/safety/safety.module'
import { CommunityModule } from './modules/community/community.module'
import { SavedModule } from './modules/saved/saved.module'
import { PhotosModule } from './modules/photos/photos.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { HostApplicationsModule } from './modules/host-applications/host-applications.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { MeModule } from './modules/me/me.module'
import { NotesModule } from './modules/notes/notes.module'
import { SeoModule } from './modules/seo/seo.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: {
          ignore: (req) => req.url?.startsWith('/api/health') ?? false,
        },
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AvatarsModule,
    VenuesModule,
    VenueBookingsModule,
    PartiesModule,
    MatchingModule,
    QuizModule,
    QuestionCardsModule,
    OrdersModule,
    ChatModule,
    SafetyModule,
    CommunityModule,
    SavedModule,
    PhotosModule,
    NotificationsModule,
    HostApplicationsModule,
    PaymentsModule,
    MeModule,
    NotesModule,
    LiveModule,
    SeoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
