import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'

import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { AuthModule } from './modules/auth/auth.module'
import { AvatarsModule } from './modules/avatars/avatars.module'
import { ChatModule } from './modules/chat/chat.module'
import { ClubsModule } from './modules/clubs/clubs.module'
import { CommunityModule } from './modules/community/community.module'
import { HealthModule } from './modules/health/health.module'
import { HostApplicationsModule } from './modules/host-applications/host-applications.module'
import { LiveModule } from './modules/live/live.module'
import { MatchingModule } from './modules/matching/matching.module'
import { MeModule } from './modules/me/me.module'
import { ModerationModule } from './modules/moderation/moderation.module'
import { NotesModule } from './modules/notes/notes.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { OrdersModule } from './modules/orders/orders.module'
import { PartiesModule } from './modules/parties/parties.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { PhotosModule } from './modules/photos/photos.module'
import { QuestionCardsModule } from './modules/question-cards/question-cards.module'
import { QuizModule } from './modules/quiz/quiz.module'
import { SafetyModule } from './modules/safety/safety.module'
import { SavedModule } from './modules/saved/saved.module'
import { SeoModule } from './modules/seo/seo.module'
import { UsersModule } from './modules/users/users.module'
import { VenueBookingsModule } from './modules/venue-bookings/venue-bookings.module'
import { VenuesModule } from './modules/venues/venues.module'
import { PrismaModule } from './prisma/prisma.module'

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
    ClubsModule,
    ModerationModule,
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
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
