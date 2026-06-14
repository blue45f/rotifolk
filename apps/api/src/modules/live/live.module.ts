import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { ChatModule } from '../chat/chat.module'
import { MatchingModule } from '../matching/matching.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { OrdersModule } from '../orders/orders.module'
import { PartiesModule } from '../parties/parties.module'
import { QuizModule } from '../quiz/quiz.module'

import { LiveGateway } from './live.gateway'
import { LiveOrchestrator } from './live.orchestrator'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'dev-secret-change-me'),
      }),
    }),
    MatchingModule,
    QuizModule,
    OrdersModule,
    PartiesModule,
    NotificationsModule,
    ChatModule,
  ],
  providers: [LiveGateway, LiveOrchestrator],
  exports: [LiveGateway, LiveOrchestrator],
})
export class LiveModule {}
