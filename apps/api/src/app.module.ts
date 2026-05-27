import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { PartiesModule } from './modules/parties/parties.module'
import { VenuesModule } from './modules/venues/venues.module'
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AvatarsModule,
    VenuesModule,
    PartiesModule,
    MatchingModule,
    QuizModule,
    QuestionCardsModule,
    OrdersModule,
    ChatModule,
    SafetyModule,
    CommunityModule,
    LiveModule,
  ],
})
export class AppModule {}
