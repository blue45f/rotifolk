import { Body, Controller, Get, Param, Post, UseGuards, UsePipes } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CreateQuizSchema, SubmitQuizAnswerSchema } from '@rotifolk/shared'
import type { CreateQuizDto, SubmitQuizAnswerDto } from '@rotifolk/shared'
import { ZodValidationPipe } from '@/common/zod-validation.pipe'
import { CurrentUser, type JwtUserPayload } from '@/common/current-user.decorator'
import { QuizService } from './quiz.service'

@Controller('parties/:partyId/quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get()
  list(@Param('partyId') partyId: string) {
    return this.quiz.list(partyId)
  }

  @Get('leaderboard')
  leaderboard(@Param('partyId') partyId: string) {
    return this.quiz.leaderboard(partyId)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(CreateQuizSchema))
  create(
    @CurrentUser() me: JwtUserPayload,
    @Param('partyId') partyId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quiz.create(me.sub, { ...dto, partyId })
  }

  @Post(':questionId/launch')
  @UseGuards(AuthGuard('jwt'))
  launch(@CurrentUser() me: JwtUserPayload, @Param('questionId') questionId: string) {
    return this.quiz.launch(me.sub, questionId)
  }

  @Post('answer')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(SubmitQuizAnswerSchema))
  answer(@CurrentUser() me: JwtUserPayload, @Body() dto: SubmitQuizAnswerDto) {
    return this.quiz.answer(me.sub, dto)
  }
}
