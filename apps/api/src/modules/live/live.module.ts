import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LiveGateway } from './live.gateway'
import { LiveOrchestrator } from './live.orchestrator'
import { MatchingModule } from '../matching/matching.module'
import { QuizModule } from '../quiz/quiz.module'
import { OrdersModule } from '../orders/orders.module'
import { PartiesModule } from '../parties/parties.module'
import { NotificationsModule } from '../notifications/notifications.module'

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
  ],
  providers: [LiveGateway, LiveOrchestrator],
  exports: [LiveGateway, LiveOrchestrator],
})
export class LiveModule {}
